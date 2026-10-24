"""Lazy embedding construction and task-aware EmbeddingGemma 2 adapters.

The default retrieval path uses asymmetric query/document prompts. Symmetric
similarity jobs (semantic chunking and Q&A memory) use a separate prompt while
sharing the same loaded model. Heavy ML imports stay inside model construction
so FastAPI health checks and collection management do not load PyTorch.
"""

import os
from typing import Optional, Sequence, Union

from langchain_core.embeddings import Embeddings


DEFAULT_EMBEDDING_MODEL = "google/embeddinggemma-2"
DEFAULT_EMBEDDING_DIMS = 768
EMBEDDING_GEMMA_2_DIMS = frozenset({768, 512, 256, 128})


def get_embedding_model_name() -> str:
    """Return the configured model, falling back to EmbeddingGemma 2."""
    return (
        os.getenv("EMBEDDING_MODEL", DEFAULT_EMBEDDING_MODEL).strip()
        or DEFAULT_EMBEDDING_MODEL
    )


def is_embedding_gemma_2(model_name: str) -> bool:
    """Recognize both the Hub ID and a local checkout of the same model."""
    normalized = model_name.strip().rstrip("/\\").lower()
    return (
        normalized == DEFAULT_EMBEDDING_MODEL
        or normalized.endswith("/embeddinggemma-2")
        or normalized.endswith("\\embeddinggemma-2")
    )


def validate_embedding_dimensions(
    dimensions: int, model_name: Optional[str] = None
) -> int:
    """Validate table dimensions before creating an empty collection."""
    model_name = model_name or get_embedding_model_name()
    if dimensions <= 0:
        raise ValueError("EMBEDDING_DIMS must be a positive integer.")
    if is_embedding_gemma_2(model_name) and dimensions not in EMBEDDING_GEMMA_2_DIMS:
        supported = ", ".join(
            str(value) for value in sorted(EMBEDDING_GEMMA_2_DIMS, reverse=True)
        )
        raise ValueError(
            f"EmbeddingGemma 2 supports EMBEDDING_DIMS values {supported}; "
            f"received {dimensions}. Queries and documents must use the same dimension."
        )
    return dimensions


def get_embedding_dimensions(model_name: Optional[str] = None) -> int:
    """Read and validate the fixed-size vector dimension for new tables."""
    raw_value = os.getenv("EMBEDDING_DIMS", str(DEFAULT_EMBEDDING_DIMS))
    try:
        dimensions = int(raw_value)
    except ValueError as exc:
        raise ValueError("EMBEDDING_DIMS must be an integer.") from exc
    return validate_embedding_dimensions(dimensions, model_name)


class _SimilarityEmbeddings(Embeddings):
    """Expose symmetric embeddings through LangChain's standard interface."""

    def __init__(self, parent: "EmbeddingGemma2Embeddings"):
        self._parent = parent

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return self._parent.embed_similarity(texts)

    def embed_query(self, text: str) -> list[float]:
        return self._parent.embed_similarity([text])[0]


class EmbeddingGemma2Embeddings(Embeddings):
    """Sentence Transformers adapter with EmbeddingGemma 2 task prompts.

    Documents without extracted titles use the built-in ``Document`` prompt,
    which applies the model's ``title: none`` format. MRL truncation is paired
    with final normalization as required for cosine retrieval.
    """

    def __init__(
        self,
        model_name: Optional[str] = None,
        dimensions: Optional[int] = None,
        batch_size: Optional[int] = None,
        text_only: Optional[bool] = None,
        model=None,
    ):
        self.model_name = model_name or get_embedding_model_name()
        self.dimensions = (
            get_embedding_dimensions(self.model_name)
            if dimensions is None
            else validate_embedding_dimensions(dimensions, self.model_name)
        )
        self.batch_size = (
            int(os.getenv("EMBEDDING_BATCH_SIZE", "32"))
            if batch_size is None
            else batch_size
        )
        if self.batch_size <= 0:
            raise ValueError("EMBEDDING_BATCH_SIZE must be a positive integer.")
        self.text_only = (
            os.getenv("EMBEDDING_TEXT_ONLY", "true").lower() == "true"
            if text_only is None
            else text_only
        )
        self.device = os.getenv("EMBEDDING_DEVICE", "").strip() or None
        self.model = model if model is not None else self._load_model()

    def _load_model(self):
        """Load only the text encoder and never select incompatible float16."""
        import torch
        from sentence_transformers import SentenceTransformer

        cuda_selected = (
            self.device.startswith("cuda") if self.device else torch.cuda.is_available()
        )
        use_bfloat16 = cuda_selected and torch.cuda.is_bf16_supported()
        dtype = torch.bfloat16 if use_bfloat16 else torch.float32

        options = {
            "model_kwargs": {"torch_dtype": dtype},
            "truncate_dim": self.dimensions,
        }
        if self.device:
            options["device"] = self.device
        if self.text_only:
            # Avoid loading the unused 170M vision and 300M audio encoders.
            options["config_kwargs"] = {
                "vision_config": None,
                "audio_config": None,
            }

        return SentenceTransformer(self.model_name, **options)

    def _encode(
        self,
        texts: Union[str, Sequence[str]],
        prompt_name: str,
    ):
        return self.model.encode(
            texts,
            prompt_name=prompt_name,
            batch_size=self.batch_size,
            convert_to_numpy=True,
            normalize_embeddings=True,
            show_progress_bar=False,
            truncate_dim=self.dimensions,
        )

    @staticmethod
    def _as_lists(encoded):
        return encoded.tolist() if hasattr(encoded, "tolist") else encoded

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        encoded = self._encode(list(texts), "Document")
        return self._as_lists(encoded)

    def embed_query(self, text: str) -> list[float]:
        encoded = self._encode(text, "SearchQuery")
        return self._as_lists(encoded)

    def embed_similarity(self, texts: list[str]) -> list[list[float]]:
        """Embed symmetric sentence-similarity inputs, not retrieval docs."""
        if not texts:
            return []
        encoded = self._encode(list(texts), "SentenceSimilarity")
        return self._as_lists(encoded)

    def for_semantic_chunking(self) -> Embeddings:
        """Reuse this model with symmetric prompts for SemanticChunker."""
        return _SimilarityEmbeddings(self)


def create_embeddings() -> Embeddings:
    """Construct the configured embedding backend without module-level ML imports."""
    model_name = get_embedding_model_name()
    if is_embedding_gemma_2(model_name):
        return EmbeddingGemma2Embeddings(model_name=model_name)

    # Preserve explicit custom-model overrides without retaining a second
    # default. All normal application paths use EmbeddingGemma 2 above.
    from langchain_huggingface import HuggingFaceEmbeddings

    return HuggingFaceEmbeddings(model_name=model_name)


def semantic_chunking_embeddings(embeddings: Embeddings) -> Embeddings:
    """Select task-appropriate symmetric embeddings when the backend supports it."""
    factory = getattr(embeddings, "for_semantic_chunking", None)
    return factory() if callable(factory) else embeddings


def embed_similarity_query(embeddings: Embeddings, text: str) -> list[float]:
    """Embed a question for comparison with other questions in Q&A memory."""
    similarity_encoder = getattr(embeddings, "embed_similarity", None)
    if callable(similarity_encoder):
        return similarity_encoder([text])[0]
    return embeddings.embed_query(text)
