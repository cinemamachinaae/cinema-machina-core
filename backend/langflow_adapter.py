#!/usr/bin/env python3
import os
import json
import urllib.request
import urllib.error

LANGFLOW_URLS = ["http://127.0.0.1:7860", "http://127.0.0.1:7861"]
DEFAULT_FLOW_ID = os.environ.get("LANGFLOW_FLOW_ID")

def check_health():
    """Detects Langflow running locally and checks API endpoint."""
    for base_url in LANGFLOW_URLS:
        try:
            req = urllib.request.Request(f"{base_url}/health", method="GET")
            with urllib.request.urlopen(req, timeout=2) as response:
                if response.status == 200:
                    return {"available": True, "url": base_url, "message": "Langflow daemon reachable"}
        except Exception:
            pass
        
        # Fallback check version endpoint
        try:
            req = urllib.request.Request(f"{base_url}/api/v1/version", method="GET")
            with urllib.request.urlopen(req, timeout=2) as response:
                if response.status == 200:
                    return {"available": True, "url": base_url, "message": "Langflow daemon reachable (v1 API)"}
        except Exception:
            pass

    return {"available": False, "url": None, "message": "Langflow daemon not reachable"}

def send_context(payload: dict, flow_id: str = None):
    """Sends a compact Cinema Machina context payload when configured."""
    health = check_health()
    if not health["available"]:
        return {"success": False, "error": health["message"]}
    
    target_flow_id = flow_id or DEFAULT_FLOW_ID
    if not target_flow_id:
        return {"success": False, "error": "LANGFLOW_FLOW_ID not configured"}

    base_url = health["url"]
    endpoint = f"{base_url}/api/v1/process/{target_flow_id}"
    
    data = json.dumps({"inputs": payload}).encode("utf-8")
    req = urllib.request.Request(endpoint, data=data, method="POST", headers={"Content-Type": "application/json"})
    
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            return {"success": True, "response": res_data}
    except Exception as e:
        return {"success": False, "error": str(e)}

def integration_health():
    """Returns a structured integration-health response."""
    health = check_health()
    if not health["available"]:
        return {"status": "unknown", "level": "unknown", "detail": "Missing: Langflow daemon not reachable"}
    
    if not DEFAULT_FLOW_ID:
        return {
            "status": "warn",
            "level": "warn",
            "detail": f"Detected: Reachable at {health['url']} but LANGFLOW_FLOW_ID is missing"
        }
    
    return {
        "status": "ok",
        "level": "ok",
        "detail": f"Configured: Reachable at {health['url']} with flow {DEFAULT_FLOW_ID}"
    }

if __name__ == "__main__":
    print(json.dumps(integration_health(), indent=2))
