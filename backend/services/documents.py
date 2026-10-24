"""Safe upload handling and document processing jobs."""

import ntpath
import uuid
from pathlib import Path
from typing import List

from fastapi import UploadFile

from backend.config import (
    SUPPORTED_EXTENSIONS,
    get_documents_dir,
    get_max_upload_bytes,
)
from backend.services.collections import normalize_name


def collection_directory(collection_name: str) -> Path:
    normalized = normalize_name(collection_name)
    root = get_documents_dir().resolve()
    directory = (root / normalized).resolve()
    if directory.parent != root:
        raise ValueError("Invalid collection document path.")
    directory.mkdir(parents=True, exist_ok=True)
    return directory


def safe_filename(filename: str) -> str:
    if not filename or filename != ntpath.basename(filename):
        raise ValueError("Filename must not contain path separators.")
    cleaned = filename.strip().replace("\x00", "")
    if cleaned in {"", ".", ".."} or cleaned != filename:
        raise ValueError("Invalid filename.")
    extension = Path(cleaned).suffix.lower().lstrip(".")
    if extension not in SUPPORTED_EXTENSIONS:
        raise ValueError(f"Unsupported file type: {extension or 'none'}")
    return cleaned


async def save_uploads(collection_name: str, uploads: List[UploadFile]) -> List[Path]:
    if not uploads:
        raise ValueError("Choose at least one file to upload.")

    directory = collection_directory(collection_name)
    max_bytes = get_max_upload_bytes()
    temporary_files = []
    seen_names = set()
    try:
        # Validate every upload into a temporary file before replacing any
        # existing document with the same name.
        for upload in uploads:
            filename = safe_filename(upload.filename or "")
            if filename in seen_names:
                raise ValueError(f"Duplicate filename in upload: {filename}")
            seen_names.add(filename)

            destination = directory / filename
            temporary = directory / f".{uuid.uuid4().hex}.upload"
            temporary_files.append((temporary, destination))
            size = 0
            with temporary.open("xb") as output:
                while chunk := await upload.read(1024 * 1024):
                    size += len(chunk)
                    if size > max_bytes:
                        raise OverflowError(
                            f"'{filename}' exceeds the {max_bytes // (1024 * 1024)} MB limit."
                        )
                    output.write(chunk)
            if size == 0:
                raise ValueError(f"'{filename}' is empty.")
            await upload.close()

    except Exception:
        for temporary, _ in temporary_files:
            temporary.unlink(missing_ok=True)
        raise
    finally:
        for upload in uploads:
            await upload.close()

    saved = []
    for temporary, destination in temporary_files:
        temporary.replace(destination)
        saved.append(destination)
    return saved


def process_saved_documents(
    engine,
    paths: List[Path],
    progress_callback,
) -> dict:
    total_chunks = 0
    processed_files = 0
    errors: List[str] = []
    total = len(paths)

    for index, path in enumerate(paths):
        def update(progress: float, _index=index) -> None:
            progress_callback((_index + progress) / total)

        try:
            total_chunks += engine.add_documents(
                str(path),
                progress_callback=update,
            )
            processed_files += 1
        except Exception as exc:
            errors.append(f"{path.name}: {exc}")

    progress_callback(1.0)
    return {
        "processed_files": processed_files,
        "total_chunks": total_chunks,
        "errors": errors,
    }
