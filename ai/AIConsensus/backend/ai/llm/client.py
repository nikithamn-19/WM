"""LLM Client configuration and safe caller with robust fallback."""

import json
import os
import re
from typing import Any, Callable, Dict, Optional

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None


import socket
from urllib.parse import urlparse

def _load_env():
    """Lightweight .env loader without extra dependencies."""
    env_file = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env"))
    if os.path.exists(env_file):
        try:
            with open(env_file, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip("'\"")
                        if k and k not in os.environ:
                            os.environ[k] = v
        except Exception:
            pass

_load_env()

def is_llm_reachable(endpoint: str, timeout: float = 0.4) -> bool:
    """Fast check whether the LLM host and port are accepting connections."""
    try:
        parsed = urlparse(endpoint)
        host = parsed.hostname or "localhost"
        port = parsed.port or (443 if parsed.scheme == "https" else 80)
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except Exception:
        return False


def get_llm_config():
    """Detects available LLM provider and returns (base_url, api_key, default_model)."""
    # 1. Google Gemini via OpenAI-compatible endpoint
    gemini_key = os.environ.get("GEMINI_API_KEY")
    if gemini_key:
        return "https://generativelanguage.googleapis.com/v1beta/openai/", gemini_key, "gemini-1.5-flash"

    # 2. Groq cloud
    groq_key = os.environ.get("GROQ_API_KEY")
    if groq_key:
        return "https://api.groq.com/openai/v1", groq_key, "openai/gpt-oss-120b"

    # 3. Official OpenAI
    openai_key = os.environ.get("OPENAI_API_KEY")
    if openai_key:
        return "https://api.openai.com/v1", openai_key, "gpt-4o-mini"

    # 4. Ngrok / Custom tunnel or local Ollama
    endpoint = os.environ.get("NGROK_LLM_URL", os.environ.get("LLM_URL", "http://localhost:11434")).rstrip("/")
    if is_llm_reachable(endpoint):
        base_url = endpoint if endpoint.endswith("/v1") else f"{endpoint}/v1"
        api_key = os.environ.get("LLM_API_KEY", "ollama")
        return base_url, api_key, "phi4-mini"

    return None, None, None


def get_llm_client():
    """Returns an OpenAI client pointing at detected provider."""
    if OpenAI is None:
        return None
    base_url, api_key, _ = get_llm_config()
    if not base_url or not api_key:
        return None
    return OpenAI(base_url=base_url, api_key=api_key, timeout=12.0)


def call_llm(
    system_prompt: str,
    user_message: str,
    model: Optional[str] = None,
    timeout: float = 12.0,
    expect_json: bool = True,
) -> str:
    """Calls detected LLM endpoint with automatic model selection."""
    client = get_llm_client()
    if client is None:
        raise ConnectionError("No reachable LLM provider found (Ollama offline, no API key set)")

    _, _, default_model = get_llm_config()
    selected_model = os.environ.get("LLM_MODEL") or model or default_model or "phi4-mini"

    kwargs = {
        "model": selected_model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        "timeout": timeout,
    }
    if expect_json:
        kwargs["response_format"] = {"type": "json_object"}

    response = client.chat.completions.create(**kwargs)
    return response.choices[0].message.content or ""


def safe_llm_call(
    system_prompt: str,
    user_message: str,
    fallback_result: Any,
    fallback_fn: Optional[Callable[[str], Any]] = None,
) -> Any:
    """Safely executes LLM query; strips markdown code fences and returns fallback if offline."""
    try:
        raw = call_llm(system_prompt, user_message, timeout=6.0, expect_json=True)
        raw = raw.strip()
        # Strip ```json ... ``` codeblocks if present
        if raw.startswith("```"):
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw)
        parsed = json.loads(raw.strip())
        return parsed
    except Exception as e:
        err_msg = str(e)
        if "credit_balance_exhausted" in err_msg or "insufficient_quota" in err_msg:
            print("[LLM NOTICE] OpenAI key has $0 credit balance (credit_balance_exhausted). Using smart fallback.")
            print("  -> Tip: Get a free key with no credit card at https://console.groq.com/keys or https://aistudio.google.com/apikey")
        else:
            print(f"[LLM NOTICE] {e}")

        # If dynamic fallback generator provided, use it
        if fallback_fn is not None:
            try:
                return fallback_fn(user_message)
            except Exception:
                pass
        return fallback_result
