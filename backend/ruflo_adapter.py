#!/usr/bin/env python3
"""Truthful RuFlo readiness adapter for the Cinema Machina Brain Portal."""

from __future__ import annotations

import json
import os
from pathlib import Path
import shutil
import subprocess

REPO_ROOT = Path(__file__).resolve().parents[1]
OFFICIAL_CONFIG = REPO_ROOT / ".claude-flow" / "config.yaml"
LEGACY_TOML = REPO_ROOT / "ruflo.toml"
LEGACY_JSON = REPO_ROOT / "ruflo.config.json"
CONTEXT_PACK = REPO_ROOT / "tools" / "brain-portal" / "tools" / "brain-ops" / "data" / "context" / "agent-context-pack.md"
WORKFLOW_FILE = REPO_ROOT / ".claude-flow" / "workflows" / "cinema-machina-brain-check.json"


def run_ruflo(args: list[str], timeout: int = 8) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["ruflo", *args],
        capture_output=True,
        text=True,
        timeout=timeout,
        cwd=REPO_ROOT,
    )


def config_path() -> Path | None:
    for path in (OFFICIAL_CONFIG, LEGACY_TOML, LEGACY_JSON):
        if path.exists() and path.stat().st_size > 0:
            return path
    return None


def check_health() -> dict[str, str | bool]:
    """Detect actual RuFlo executable and repo config availability."""
    ruflo_path = shutil.which("ruflo")
    if not ruflo_path:
        return {"available": False, "message": "ruflo binary not on PATH"}

    path = config_path()
    if path is None:
        return {"available": False, "message": "ruflo binary found, but no repo config"}

    return {
        "available": True,
        "message": "RuFlo executable and repo config found",
        "config": str(path.relative_to(REPO_ROOT)),
    }


def trigger_workflow(context_pack_path: str) -> dict[str, str | bool]:
    """Validate the repo wiring before handing context to RuFlo."""
    health = check_health()
    if not health["available"]:
        return {"success": False, "error": str(health["message"])}

    if not os.path.exists(context_pack_path):
        return {"success": False, "error": f"Context pack not found at {context_pack_path}"}

    try:
        result = run_ruflo(["status"], timeout=8)
        if result.returncode == 0:
            return {"success": True, "output": "RuFlo repo config validated with status command"}
        return {"success": False, "error": (result.stderr or result.stdout).strip()}
    except Exception as exc:
        return {"success": False, "error": str(exc)}


def workflow_validation_support() -> dict[str, str | bool]:
    if not WORKFLOW_FILE.exists() or WORKFLOW_FILE.stat().st_size == 0:
        return {"supported": False, "detail": f"missing workflow file {WORKFLOW_FILE.relative_to(REPO_ROOT)}"}

    try:
        result = run_ruflo(["workflow", "validate", "--file", str(WORKFLOW_FILE)], timeout=8)
    except Exception as exc:
        return {"supported": False, "detail": str(exc)}

    output = "\n".join(part for part in [result.stdout, result.stderr] if part).strip()
    if "Unknown command: workflow validate" in output:
        return {"supported": False, "detail": "installed alpha CLI exposes workflow help but rejects workflow subcommands"}
    return {
        "supported": result.returncode == 0,
        "detail": output[:300] or f"exit {result.returncode}",
        "workflow": str(WORKFLOW_FILE.relative_to(REPO_ROOT)),
    }


def workflow_links_repo() -> bool:
    try:
        workflow = json.loads(WORKFLOW_FILE.read_text(encoding="utf-8"))
    except Exception:
        return False

    encoded = json.dumps(workflow)
    required = [
        "scripts/cm-agent-context-refresh.sh",
        "scripts/cm-brain-check.sh",
    ]
    return all(item in encoded for item in required)


def integration_health() -> dict:
    """Expose truthful RuFlo readiness."""
    ruflo_path = shutil.which("ruflo")
    if not ruflo_path:
        return {
            "status": "binary_missing",
            "level": "warn",
            "detail": "ruflo binary not on PATH",
        }

    version = "unknown"
    try:
        version_result = run_ruflo(["--version"], timeout=3)
        version = (version_result.stdout or version_result.stderr).strip() or "unknown"
    except Exception:
        pass

    path = config_path()
    if path is None:
        return {
            "status": "config_missing",
            "level": "warn",
            "detail": f"Detected: {version}; repo config missing. Run `ruflo init` from repo root to create .claude-flow/config.yaml.",
            "binary": ruflo_path,
            "version": version,
        }

    if not CONTEXT_PACK.exists():
        return {
            "status": "context_missing",
            "level": "warn",
            "detail": f"Detected: {version}; repo config present at {path.relative_to(REPO_ROOT)} but context pack missing",
            "binary": ruflo_path,
            "version": version,
            "config": str(path.relative_to(REPO_ROOT)),
        }

    try:
        result = run_ruflo(["status"], timeout=8)
        if result.returncode == 0:
            validation = workflow_validation_support()
            linked = validation.get("supported") is True and workflow_links_repo()
            if linked:
                return {
                    "status": "integrated",
                    "level": "ok",
                    "detail": f"Integrated: {version}; repo config valid at {path.relative_to(REPO_ROOT)}; workflow validated at {WORKFLOW_FILE.relative_to(REPO_ROOT)}",
                    "binary": ruflo_path,
                    "version": version,
                    "config": str(path.relative_to(REPO_ROOT)),
                    "workflow": str(WORKFLOW_FILE.relative_to(REPO_ROOT)),
                    "workflow_validation": validation,
                }
            return {
                "status": "workflow_unvalidated",
                "level": "warn",
                "detail": f"Configured: {version}; repo config valid at {path.relative_to(REPO_ROOT)}; workflow not validated or not linked to repo checks",
                "binary": ruflo_path,
                "version": version,
                "config": str(path.relative_to(REPO_ROOT)),
                "workflow": str(WORKFLOW_FILE.relative_to(REPO_ROOT)) if WORKFLOW_FILE.exists() else None,
                "workflow_validation": validation,
            }
        return {
            "status": "config_invalid",
            "level": "error",
            "detail": f"Configured, but `ruflo status` failed: {(result.stderr or result.stdout).strip()[:240]}",
            "binary": ruflo_path,
            "version": version,
            "config": str(path.relative_to(REPO_ROOT)),
        }
    except Exception as exc:
        return {
            "status": "error",
            "level": "error",
            "detail": f"Execution error: {str(exc)}",
            "binary": ruflo_path,
            "version": version,
            "config": str(path.relative_to(REPO_ROOT)),
        }


if __name__ == "__main__":
    print(json.dumps(integration_health(), indent=2))
