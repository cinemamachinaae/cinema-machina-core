#!/usr/bin/env python3
"""Truthful Langflow readiness adapter for the Cinema Machina Brain Portal."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any
import urllib.error
import urllib.request

REPO_ROOT = Path(__file__).resolve().parents[1]
CINEMA_FLOW_NAME = "Cinema Machina Brain Orchestration"
CINEMA_FLOW_ENDPOINT = "cinema-machina-brain-orchestration"


def load_local_env() -> None:
    """Load ignored local env files without printing or committing secrets."""
    for env_path in (REPO_ROOT / ".env.local", REPO_ROOT / ".env"):
        if not env_path.exists():
            continue
        try:
            for raw_line in env_path.read_text(encoding="utf-8").splitlines():
                line = raw_line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, value = line.split("=", 1)
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if key and key not in os.environ:
                    os.environ[key] = value
        except OSError:
            continue


load_local_env()

LANGFLOW_URLS = [
    url.strip().rstrip("/")
    for url in os.environ.get("LANGFLOW_BASE_URL", "http://127.0.0.1:7860,http://127.0.0.1:7861").split(",")
    if url.strip()
]
DEFAULT_FLOW_ID = os.environ.get("LANGFLOW_FLOW_ID", "").strip()
DEFAULT_FLOW_ENDPOINT = os.environ.get("LANGFLOW_FLOW_ENDPOINT", CINEMA_FLOW_ENDPOINT).strip()
DEFAULT_API_KEY = os.environ.get("LANGFLOW_API_KEY", "").strip()


def request_json(
    url: str,
    *,
    method: str = "GET",
    api_key: str | None = None,
    payload: dict[str, Any] | None = None,
    timeout: float = 3,
) -> tuple[int | None, Any | None, str | None]:
    headers = {"Accept": "application/json"}
    body = None
    if payload is not None:
        body = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    if api_key:
        headers["x-api-key"] = api_key

    req = urllib.request.Request(url, data=body, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            text = response.read().decode("utf-8")
            data = json.loads(text) if text else None
            return response.status, data, None
    except urllib.error.HTTPError as exc:
        text = exc.read().decode("utf-8", errors="replace")
        try:
            data = json.loads(text) if text else None
        except json.JSONDecodeError:
            data = {"detail": text}
        return exc.code, data, None
    except Exception as exc:
        return None, None, str(exc)


def check_health() -> dict[str, Any]:
    """Detect Langflow daemon reachability without requiring auth."""
    for base_url in LANGFLOW_URLS:
        health_code, _, _ = request_json(f"{base_url}/health", timeout=2)
        version_code, version_data, _ = request_json(f"{base_url}/api/v1/version", timeout=2)
        if health_code == 200 or version_code == 200:
            return {
                "available": True,
                "url": base_url,
                "message": "Langflow daemon reachable",
                "version": (version_data or {}).get("version") if isinstance(version_data, dict) else None,
            }

    return {"available": False, "url": None, "message": "Langflow daemon not reachable"}


def api_auth_status(base_url: str, api_key: str | None) -> dict[str, Any]:
    if not api_key:
        code, _, _ = request_json(f"{base_url}/api/v1/flows/", timeout=3)
        if code == 403:
            return {"valid": False, "missing": True, "detail": "API auth missing"}
        return {"valid": False, "missing": True, "detail": "LANGFLOW_API_KEY missing"}

    code, data, error = request_json(f"{base_url}/api/v1/flows/", api_key=api_key, timeout=4)
    if code == 200:
        return {"valid": True, "missing": False, "detail": "API auth valid", "flows": data}
    if code in {401, 403}:
        return {"valid": False, "missing": False, "detail": "API auth invalid"}
    return {"valid": False, "missing": False, "detail": f"API auth probe failed ({code or error})"}


def iter_flow_items(data: Any) -> list[dict[str, Any]]:
    if isinstance(data, list):
        return [item for item in data if isinstance(item, dict)]
    if isinstance(data, dict) and isinstance(data.get("items"), list):
        return [item for item in data["items"] if isinstance(item, dict)]
    return []


def flow_is_cinema_machina(flow: dict[str, Any]) -> bool:
    haystack = " ".join(
        str(flow.get(key) or "")
        for key in ("name", "description", "endpoint_name", "action_name", "action_description")
    ).lower()
    tags = flow.get("tags")
    if isinstance(tags, list):
        haystack += " " + " ".join(str(tag).lower() for tag in tags)
    return "cinema machina" in haystack or flow.get("endpoint_name") == CINEMA_FLOW_ENDPOINT


def resolve_flow(base_url: str, api_key: str, auth_data: Any = None) -> dict[str, Any]:
    configured_target = DEFAULT_FLOW_ID or DEFAULT_FLOW_ENDPOINT
    flows = iter_flow_items(auth_data)
    if not flows:
        code, data, _ = request_json(f"{base_url}/api/v1/flows/", api_key=api_key, timeout=4)
        if code == 200:
            flows = iter_flow_items(data)

    if DEFAULT_FLOW_ID:
        code, data, _ = request_json(f"{base_url}/api/v1/flows/{DEFAULT_FLOW_ID}", api_key=api_key, timeout=4)
        if code == 200 and isinstance(data, dict):
            return {"found": True, "flow": data, "target": DEFAULT_FLOW_ID, "lookup": "id"}
        return {"found": False, "target": DEFAULT_FLOW_ID, "lookup": "id", "detail": f"flow id not reachable ({code})"}

    for flow in flows:
        if flow.get("endpoint_name") == DEFAULT_FLOW_ENDPOINT or flow.get("name") == DEFAULT_FLOW_ENDPOINT:
            return {"found": True, "flow": flow, "target": DEFAULT_FLOW_ENDPOINT, "lookup": "endpoint"}

    for flow in flows:
        if flow.get("name") == CINEMA_FLOW_NAME or flow_is_cinema_machina(flow):
            return {"found": True, "flow": flow, "target": flow.get("id"), "lookup": "discovered"}

    return {
        "found": False,
        "target": configured_target,
        "lookup": "endpoint",
        "detail": "Cinema Machina flow ID/alias missing",
    }


def send_context(payload: dict[str, Any], flow_id: str | None = None) -> dict[str, Any]:
    """Send compact context to the configured Langflow run endpoint."""
    health = check_health()
    if not health["available"]:
        return {"success": False, "error": health["message"]}

    target_flow_id = flow_id or DEFAULT_FLOW_ID or DEFAULT_FLOW_ENDPOINT
    if not target_flow_id:
        return {"success": False, "error": "LANGFLOW_FLOW_ID or LANGFLOW_FLOW_ENDPOINT not configured"}
    if not DEFAULT_API_KEY:
        return {"success": False, "error": "LANGFLOW_API_KEY not configured"}

    endpoint = f"{health['url']}/api/v1/run/{target_flow_id}"
    request_payload = {
        "input_request": {
            "input_value": json.dumps(payload, ensure_ascii=False),
            "input_type": "text",
            "output_type": "text",
        },
        "context": {"source": "cinema-machina-core"},
    }
    code, data, error = request_json(endpoint, method="POST", api_key=DEFAULT_API_KEY, payload=request_payload, timeout=10)
    if code and 200 <= code < 300:
        return {"success": True, "response": data}
    return {"success": False, "error": f"Langflow run failed ({code or error})"}


def integration_health() -> dict[str, Any]:
    """Return truthful Langflow readiness without exposing secrets."""
    health = check_health()
    if not health["available"]:
        return {
            "status": "daemon_missing",
            "level": "unknown",
            "detail": "Missing: Langflow daemon not reachable",
        }

    base_url = health["url"]
    auth = api_auth_status(base_url, DEFAULT_API_KEY)
    if not auth["valid"]:
        return {
            "status": "api_auth_missing" if auth.get("missing") else "api_auth_invalid",
            "level": "warn",
            "detail": f"Detected: daemon reachable at {base_url}; {auth['detail']}; flow not validated",
            "base_url": base_url,
            "version": health.get("version"),
            "flow_target": DEFAULT_FLOW_ID or DEFAULT_FLOW_ENDPOINT,
        }

    flow = resolve_flow(base_url, DEFAULT_API_KEY, auth.get("flows"))
    if not flow["found"]:
        return {
            "status": "flow_missing",
            "level": "warn",
            "detail": f"Detected: daemon reachable and API auth valid; {flow.get('detail', 'flow missing')}",
            "base_url": base_url,
            "version": health.get("version"),
            "flow_target": flow.get("target"),
        }

    flow_data = flow["flow"]
    if not flow_is_cinema_machina(flow_data):
        return {
            "status": "flow_unverified",
            "level": "warn",
            "detail": f"Detected: flow reachable but not tied to Cinema Machina ({flow_data.get('name') or flow_data.get('id')})",
            "base_url": base_url,
            "version": health.get("version"),
            "flow_id": flow_data.get("id"),
            "flow_endpoint": flow_data.get("endpoint_name"),
        }

    return {
        "status": "integrated",
        "level": "ok",
        "detail": f"Integrated: {flow_data.get('name')} flow reachable at {base_url} via {flow_data.get('endpoint_name') or flow_data.get('id')}",
        "base_url": base_url,
        "version": health.get("version"),
        "flow_id": flow_data.get("id"),
        "flow_endpoint": flow_data.get("endpoint_name"),
    }


if __name__ == "__main__":
    print(json.dumps(integration_health(), indent=2))
