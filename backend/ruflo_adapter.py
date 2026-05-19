#!/usr/bin/env python3
import os
import json
import shutil
import subprocess

RUFLO_TOML = "ruflo.toml"
RUFLO_CONFIG = "ruflo.config.json"

def check_health():
    """Detects actual RuFlo executable and config availability."""
    # Check if ruflo is on PATH
    ruflo_path = shutil.which("ruflo")
    if not ruflo_path:
        return {"available": False, "message": "ruflo binary not on PATH"}
    
    has_toml = os.path.exists(RUFLO_TOML)
    has_json = os.path.exists(RUFLO_CONFIG)
    
    if not has_toml and not has_json:
        return {"available": False, "message": "ruflo binary found, but no ruflo.toml or ruflo.config.json"}
    
    return {"available": True, "message": "RuFlo executable and config found"}

def trigger_workflow(context_pack_path: str):
    """Entrypoint to consume generated context packs and hand off to Graphify."""
    health = check_health()
    if not health["available"]:
        return {"success": False, "error": health["message"]}
    
    if not os.path.exists(context_pack_path):
        return {"success": False, "error": f"Context pack not found at {context_pack_path}"}
    
    # Example command to run RuFlo workflow passing the context pack
    try:
        # In a real scenario, this would be: `ruflo run ai-enrichment --context-pack {context_pack_path}`
        # For now, we perform a non-destructive readiness command
        result = subprocess.run(["ruflo", "--version"], capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            return {"success": True, "output": result.stdout.strip()}
        else:
            return {"success": False, "error": result.stderr.strip()}
    except Exception as e:
        return {"success": False, "error": str(e)}

def integration_health():
    """Expose health/readiness status."""
    ruflo_path = shutil.which("ruflo")
    if not ruflo_path:
        return {
            "status": "warn",
            "level": "warn",
            "detail": "ruflo binary not on PATH"
        }
    
    has_toml = os.path.exists(RUFLO_TOML)
    has_json = os.path.exists(RUFLO_CONFIG)
    
    if not has_toml and not has_json:
        return {
            "status": "warn",
            "level": "warn",
            "detail": "Detected: ruflo binary found, but no ruflo.toml"
        }
    
    # Try running a simple command
    try:
        result = subprocess.run(["ruflo", "--version"], capture_output=True, text=True, timeout=2)
        if result.returncode == 0:
            return {
                "status": "ok",
                "level": "ok", # Returning ok because config is present
                "detail": f"Configured ({result.stdout.strip()})"
            }
        else:
            return {
                "status": "warn",
                "level": "warn",
                "detail": "Configured, but execution failed"
            }
    except Exception as e:
        return {
            "status": "error",
            "level": "error",
            "detail": f"Execution error: {str(e)}"
        }

if __name__ == "__main__":
    print(json.dumps(integration_health(), indent=2))
