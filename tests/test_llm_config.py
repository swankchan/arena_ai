"""Connectivity checks for the configured local llama.cpp server."""

import os
import unittest
from unittest.mock import patch

import httpx

from backend.llm_config import check_llm_connection


class FakeAsyncClient:
    def __init__(self, response=None, error=None):
        self.response = response
        self.error = error
        self.calls = []

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return None

    async def get(self, url, headers):
        self.calls.append((url, headers))
        if self.error is not None:
            raise self.error
        return self.response


class LLMConnectionTest(unittest.IsolatedAsyncioTestCase):
    async def test_models_endpoint_uses_llama_config_and_auth(self):
        client = FakeAsyncClient(response=httpx.Response(200))
        env = {
            "LLAMA_CPP_BASE_URL": "http://localhost:8080/v1/",
            "LLAMA_CPP_API_KEY": "test-secret",
        }
        with patch.dict(os.environ, env), patch(
            "httpx.AsyncClient",
            return_value=client,
        ) as constructor:
            connected = await check_llm_connection()

        self.assertTrue(connected)
        constructor.assert_called_once_with(timeout=2.0)
        self.assertEqual(client.calls, [(
            "http://localhost:8080/v1/models",
            {"Authorization": "Bearer test-secret"},
        )])

    async def test_non_success_response_means_disconnected(self):
        client = FakeAsyncClient(response=httpx.Response(503))
        with patch("httpx.AsyncClient", return_value=client):
            self.assertFalse(await check_llm_connection())

    async def test_network_error_means_disconnected(self):
        client = FakeAsyncClient(error=httpx.ConnectError("offline"))
        with patch("httpx.AsyncClient", return_value=client):
            self.assertFalse(await check_llm_connection())


if __name__ == "__main__":
    unittest.main()
