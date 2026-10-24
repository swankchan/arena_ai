"""Small in-process job runner for document ingestion.

Jobs are deliberately transient; no Redis or external queue is required. The
default single worker also avoids concurrent embedding and LanceDB write loads.
"""

import threading
import time
import uuid
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor

from backend.config import get_ingestion_workers


class JobManager:
    def __init__(self, max_workers: int | None = None):
        self._lock = threading.RLock()
        self._jobs: dict[str, dict] = {}
        self._executor = ThreadPoolExecutor(
            max_workers=max_workers or get_ingestion_workers(),
            thread_name_prefix="rag-ingestion",
        )

    def submit(
        self,
        collection_name: str,
        filenames: list[str],
        worker: Callable[[Callable[[float], None]], dict],
    ) -> dict:
        job_id = uuid.uuid4().hex
        now = time.time()
        with self._lock:
            self._jobs[job_id] = {
                "id": job_id,
                "collection": collection_name,
                "status": "queued",
                "progress": 0.0,
                "filenames": filenames,
                "processed_files": 0,
                "total_files": len(filenames),
                "vector_files": 0,
                "tabular_files": 0,
                "total_chunks": 0,
                "total_rows": 0,
                "file_results": [],
                "errors": [],
                "created_at": now,
                "updated_at": now,
            }
        self._executor.submit(self._run, job_id, worker)
        return self.get(job_id)

    def _run(self, job_id: str, worker) -> None:
        with self._lock:
            self._jobs[job_id]["status"] = "running"
            self._jobs[job_id]["updated_at"] = time.time()

        def progress(value: float) -> None:
            with self._lock:
                job = self._jobs.get(job_id)
                if job and job["status"] == "running":
                    job["progress"] = max(0.0, min(float(value), 0.99))
                    job["updated_at"] = time.time()

        try:
            result = worker(progress)
            with self._lock:
                job = self._jobs[job_id]
                job.update(result)
                job["processed_files"] = result.get(
                    "processed_files",
                    job["total_files"],
                )
                job["errors"] = result.get("errors", [])
                job["status"] = (
                    "failed"
                    if job["errors"] and job["processed_files"] == 0
                    else "succeeded"
                )
                job["progress"] = 1.0 if job["status"] == "succeeded" else job["progress"]
                job["updated_at"] = time.time()
        except Exception as exc:  # noqa: BLE001 - isolate worker failure
            with self._lock:
                job = self._jobs[job_id]
                job["status"] = "failed"
                job["errors"] = [str(exc)]
                job["updated_at"] = time.time()

    def get(self, job_id: str) -> dict | None:
        with self._lock:
            job = self._jobs.get(job_id)
            return dict(job) if job else None

    def has_active(self, collection_name: str) -> bool:
        with self._lock:
            return any(
                job["collection"] == collection_name
                and job["status"] in {"queued", "running"}
                for job in self._jobs.values()
            )

    def shutdown(self) -> None:
        self._executor.shutdown(wait=False, cancel_futures=True)
