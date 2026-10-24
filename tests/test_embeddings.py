"""Deterministic EmbeddingGemma 2 adapter tests; no model download required."""

import os
import sys
import types
import unittest
from unittest.mock import Mock, patch

import numpy as np

from backend.embeddings import (
    DEFAULT_EMBEDDING_DIMS,
    DEFAULT_EMBEDDING_MODEL,
    EmbeddingGemma2Embeddings,
    create_embeddings,
    embed_similarity_query,
    get_embedding_dimensions,
    get_embedding_model_name,
    is_embedding_gemma_2,
)


class FakeSentenceTransformer:
    def __init__(self, dimensions=128):
        self.dimensions = dimensions
        self.calls = []

    def encode(self, texts, **kwargs):
        self.calls.append((texts, kwargs))
        if isinstance(texts, str):
            return np.ones(self.dimensions, dtype=np.float32)
        return np.ones((len(texts), self.dimensions), dtype=np.float32)


class EmbeddingGemma2Test(unittest.TestCase):
    def test_default_and_mrl_dimensions_are_validated(self):
        with patch.dict(os.environ, {}, clear=True):
            self.assertEqual(get_embedding_model_name(), DEFAULT_EMBEDDING_MODEL)
            self.assertEqual(get_embedding_dimensions(), 768)
            self.assertEqual(DEFAULT_EMBEDDING_DIMS, 768)

        for dimensions in (768, 512, 256, 128):
            with self.subTest(dimensions=dimensions):
                with patch.dict(os.environ, {"EMBEDDING_DIMS": str(dimensions)}):
                    self.assertEqual(
                        get_embedding_dimensions(DEFAULT_EMBEDDING_MODEL), dimensions
                    )

        for invalid in ("0", "384", "not-a-number"):
            with self.subTest(invalid=invalid):
                with patch.dict(os.environ, {"EMBEDDING_DIMS": invalid}):
                    with self.assertRaises(ValueError):
                        get_embedding_dimensions(DEFAULT_EMBEDDING_MODEL)

        with patch.dict(os.environ, {"EMBEDDING_DIMS": "3"}):
            self.assertEqual(get_embedding_dimensions("test/fake-embedding"), 3)

        self.assertTrue(is_embedding_gemma_2("/models/embeddinggemma-2"))
        self.assertFalse(is_embedding_gemma_2("test/fake-embedding"))

    def test_retrieval_and_similarity_use_distinct_task_prompts(self):
        model = FakeSentenceTransformer()
        embeddings = EmbeddingGemma2Embeddings(
            model_name=DEFAULT_EMBEDDING_MODEL,
            dimensions=128,
            batch_size=7,
            model=model,
        )

        documents = embeddings.embed_documents(["alpha", "beta"])
        query = embeddings.embed_query("find alpha")
        similar = embeddings.embed_similarity(["alpha", "another alpha"])

        self.assertEqual(len(documents), 2)
        self.assertEqual(len(query), 128)
        self.assertEqual(len(similar), 2)
        self.assertEqual(
            [call[1]["prompt_name"] for call in model.calls],
            ["Document", "SearchQuery", "SentenceSimilarity"],
        )
        for _, options in model.calls:
            self.assertTrue(options["normalize_embeddings"])
            self.assertEqual(options["truncate_dim"], 128)
            self.assertEqual(options["batch_size"], 7)
            self.assertFalse(options["show_progress_bar"])

        before = len(model.calls)
        self.assertEqual(embeddings.embed_documents([]), [])
        self.assertEqual(embeddings.embed_similarity([]), [])
        self.assertEqual(len(model.calls), before)

    def test_semantic_chunking_and_memory_share_symmetric_encoder(self):
        model = FakeSentenceTransformer()
        embeddings = EmbeddingGemma2Embeddings(
            model_name=DEFAULT_EMBEDDING_MODEL,
            dimensions=128,
            model=model,
        )
        semantic = embeddings.for_semantic_chunking()

        semantic.embed_documents(["first chunk", "second chunk"])
        semantic.embed_query("third chunk")
        memory_vector = embed_similarity_query(embeddings, "past question")

        self.assertEqual(len(memory_vector), 128)
        self.assertEqual(len(model.calls), 3)
        self.assertTrue(
            all(
                options["prompt_name"] == "SentenceSimilarity"
                for _, options in model.calls
            )
        )

    def test_text_only_cpu_load_uses_float32(self):
        torch = types.ModuleType("torch")
        torch.float32 = "float32"
        torch.bfloat16 = "bfloat16"
        torch.cuda = types.SimpleNamespace(
            is_available=lambda: True,
            is_bf16_supported=lambda: True,
        )
        sentence_transformers = types.ModuleType("sentence_transformers")
        sentence_transformers.SentenceTransformer = Mock(return_value=object())

        with patch.dict(os.environ, {"EMBEDDING_DEVICE": "cpu"}, clear=True):
            with patch.dict(
                sys.modules,
                {
                    "torch": torch,
                    "sentence_transformers": sentence_transformers,
                },
            ):
                EmbeddingGemma2Embeddings(dimensions=256)

        options = sentence_transformers.SentenceTransformer.call_args.kwargs
        self.assertEqual(options["model_kwargs"], {"torch_dtype": "float32"})
        self.assertEqual(options["device"], "cpu")
        self.assertEqual(options["truncate_dim"], 256)
        self.assertEqual(
            options["config_kwargs"],
            {
                "vision_config": None,
                "audio_config": None,
            },
        )

    def test_supported_cuda_load_uses_bfloat16_not_float16(self):
        torch = types.ModuleType("torch")
        torch.float32 = "float32"
        torch.bfloat16 = "bfloat16"
        torch.cuda = types.SimpleNamespace(
            is_available=lambda: True,
            is_bf16_supported=lambda: True,
        )
        sentence_transformers = types.ModuleType("sentence_transformers")
        sentence_transformers.SentenceTransformer = Mock(return_value=object())

        with patch.dict(os.environ, {}, clear=True):
            with patch.dict(
                sys.modules,
                {
                    "torch": torch,
                    "sentence_transformers": sentence_transformers,
                },
            ):
                EmbeddingGemma2Embeddings(dimensions=128, text_only=False)

        options = sentence_transformers.SentenceTransformer.call_args.kwargs
        self.assertEqual(options["model_kwargs"], {"torch_dtype": "bfloat16"})
        self.assertNotIn("config_kwargs", options)
        self.assertNotEqual(options["model_kwargs"]["torch_dtype"], "float16")

    def test_default_factory_uses_gemma_adapter(self):
        with patch.dict(os.environ, {}, clear=True):
            with patch("backend.embeddings.EmbeddingGemma2Embeddings") as constructor:
                create_embeddings()
        constructor.assert_called_once_with(model_name=DEFAULT_EMBEDDING_MODEL)

    def test_invalid_batch_size_fails_before_encoding(self):
        with self.assertRaisesRegex(ValueError, "EMBEDDING_BATCH_SIZE"):
            EmbeddingGemma2Embeddings(
                dimensions=128,
                batch_size=0,
                model=FakeSentenceTransformer(),
            )


if __name__ == "__main__":
    unittest.main()
