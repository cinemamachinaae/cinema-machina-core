from __future__ import annotations

import json
from pathlib import Path
from datetime import datetime, timezone

BASE = Path(__file__).parent
CAPSULE_DIR = BASE / "data" / "capsules"
CONTEXT_DIR = BASE / "data" / "context"
CONTEXT_DIR.mkdir(parents=True, exist_ok=True)


def load_latest(limit: int = 8) -> list[dict]:
    files = sorted(CAPSULE_DIR.glob("context-capsule-*.json"), reverse=True)[:limit]
    return [json.loads(path.read_text(encoding="utf-8")) for path in files]


def check_integrations(repo_root: Path) -> list[str]:
    active = []
    if (repo_root / ".codex").exists(): active.append("Codex")
    if (repo_root / ".agents").exists(): active.append("Antigravity")
    if (repo_root / ".claudecode").exists() or (repo_root / "claude.json").exists(): active.append("Claude Code")
    if (repo_root / "ruflo.toml").exists(): active.append("RuFlo")
    return active

def render(capsules: list[dict], repo_root: Path) -> str:
    lines = [
        "# Cinema Machina Agent Context Pack",
        "",
        f"Generated: {datetime.now(timezone.utc).isoformat()}",
        "",
        "Use this before acting in Codex, Claude Code, Antigravity, Graphify, Langflow, or RuFlo.",
        "",
    ]
    
    lines.append("## Integration Readiness")
    integrations = check_integrations(repo_root)
    lines.append(f"Active footprints: {', '.join(integrations) if integrations else 'None'}")
    lines.append("")
    
    graph_report = repo_root / "graphify-out" / "GRAPH_REPORT.md"
    if graph_report.exists():
        lines.append("## Graphify Summary")
        report_text = graph_report.read_text(encoding="utf-8")
        # Extract first 15 lines as summary to avoid bloat
        lines.extend(report_text.splitlines()[:15])
        lines.append("... (see full GRAPH_REPORT.md for architecture)")
        lines.append("")

    lines.append("## Recent Operation Capsules")
    for idx, c in enumerate(capsules, start=1):
        lines.extend([
            f"### Capsule {idx}: {c.get('captured_at', '')}",
            f"**Summary:** {c.get('summary', '')}",
            ""
        ])
        
        for key in ["active_workstreams", "files_or_modules", "bugs_or_failures", "decisions", "next_actions"]:
            items = c.get(key, [])
            if items:
                lines.append(f"**{key.replace('_', ' ').title()}:**")
                lines.extend([f"- {item}" for item in items])
        lines.append("")

    return "\n".join(lines)


def main() -> None:
    capsules = load_latest()
    repo_root = BASE.parents[3]
    out = CONTEXT_DIR / "agent-context-pack.md"
    out.write_text(render(capsules, repo_root), encoding="utf-8")
    print(f"[OK] Agent pack written: {out}")


if __name__ == "__main__":
    main()
