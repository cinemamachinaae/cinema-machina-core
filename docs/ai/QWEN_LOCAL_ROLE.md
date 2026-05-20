# Qwen Local Role & Operational Scope

This document defines the clear operational boundaries, execution limits, and integration responsibilities of the local **Qwen** model (running via Ollama) within the Cinema Machina Core ecosystem.

---

## 1. Primary Objectives

Within the Cinema Machina runtime, the local Qwen instance is specialized for:
1. **Real-time Telemetry Translation:** Interpreting raw ADB outputs (e.g., `dumpsys media.audio_flinger`) and Plex/Jellyfin active session logs.
2. **Deterministic Quality Inference:** Classifying playback states strictly into `confirmed`, `inferred`, or `unknown` quality states (never guessing).
3. **Structured Log Parsing:** Filtering system logs, checking container health, and validating connection states to generate system health reports.

---

## 2. Model Configuration

To ensure consistent and deterministic outputs, Qwen should be invoked with the following parameters via the Ollama endpoint:

* **Model Name:** `qwen2.5-coder:7b` (or newer local variant)
* **Temperature:** `0.0` (critical for logic/facts; avoids hallucination)
* **Top-P:** `0.9`
* **Context Window:** `16384` tokens (maximum size for local memory constraints)
* **System Prompt:** Configured to enforce JSON output matching the telemetry schema.

---

## 3. Operational Boundaries & Non-Goals

To prevent local host resource depletion and context window overflow, the following limitations are enforced:

### Out of Scope / Non-Goals
* **Broad Codebase Refactoring:** Qwen must NOT be used for repo-wide code changes. Let larger agent models (such as Antigravity or Codex) handle wide AST refactoring.
* **Complex Multi-File Edits:** Do not request Qwen to edit multiple files simultaneously. Keep prompts bounded to single-function or single-class updates.
* **Downstream Device Hardware Controls:** Qwen should never generate raw network commands (e.g., direct power cycles, AVR source switching) without routing through the safe adapters.

---

## 4. Fallback & Error Isolation

If Ollama/Qwen is offline, unreachable, or returns raw errors:
1. **Graceful Fallback:** The backend must fall back to basic regex parser logic defined in the adapters.
2. **Badging:** The Brain Portal status telemetry will badge Ollama / Qwen as `Detected` (process present but unreachable) or `Missing`, and bypass AI-based quality inference.
3. **Alerting:** Log a warning to the console: `[Ollama] Local Qwen endpoint unresponsive. Defaulting to regex parsers.`
