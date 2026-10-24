"""
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
"""

"""Shared LLM configuration for llama.cpp's OpenAI-compatible API."""

import os
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from langchain_openai import ChatOpenAI


DEFAULT_LLAMA_CPP_BASE_URL = "http://localhost:8080/v1"
DEFAULT_LLAMA_CPP_MODEL = "local-model"
# The OpenAI client requires a non-empty key even when llama.cpp auth is disabled.
DEFAULT_LLAMA_CPP_API_KEY = "not-needed"


def get_llm_config() -> dict[str, str]:
    """Return the connection settings for the local llama.cpp server."""
    return {
        "model": os.getenv("LLAMA_CPP_MODEL") or DEFAULT_LLAMA_CPP_MODEL,
        "base_url": (
            os.getenv("LLAMA_CPP_BASE_URL") or DEFAULT_LLAMA_CPP_BASE_URL
        ).rstrip("/"),
        "api_key": os.getenv("LLAMA_CPP_API_KEY") or DEFAULT_LLAMA_CPP_API_KEY,
    }


async def check_llm_connection(timeout: float = 2.0) -> bool:
    """Check llama.cpp's models endpoint without loading a model."""
    import httpx

    config = get_llm_config()
    headers = {"Authorization": f"Bearer {config['api_key']}"}
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(
                f"{config['base_url']}/models",
                headers=headers,
            )
        return response.is_success
    except (httpx.HTTPError, httpx.InvalidURL):
        # An unavailable model server must not make the backend health check fail.
        return False


def create_llm(**kwargs: Any) -> "ChatOpenAI":
    """Create a chat model backed by llama.cpp.

    Additional keyword arguments are forwarded to ``ChatOpenAI`` and can
    override the defaults, for example ``temperature=0``. The provider client
    is imported lazily so health and collection APIs stay lightweight.
    """
    from langchain_openai import ChatOpenAI

    config: dict[str, Any] = get_llm_config()
    config.update(kwargs)
    return ChatOpenAI(**config)
