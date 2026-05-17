# Codex Tool Routing Policy — Cinema Machina Core

This file defines how Codex and other coding agents should use the installed toolchain efficiently.

## Core rule
For Cinema Machina Core repo understanding, use Graphify first before broad file scanning.

## Priority order

### 1. Graphify — default repo intelligence layer
Use Graphify first for:
- architecture questions
- module relationships
- current project map
- "where is X implemented?"
- "what connects A to B?"
- large repo summaries
- reducing unnecessary rereading of files

Preferred sequence:
1. Read `graphify-out/GRAPH_REPORT.md`
2. Use `graphify query "<question>"`
3. Use `graphify explain "<node>"`
4. Use `graphify path "<A>" "<B>"` when tracing relationships
5. Only then inspect exact source files needed

### 2. Direct source reads
Use direct file inspection only when:
- Graphify is stale
- Graphify does not contain the needed detail
- exact code edits are required

### 3. Langflow
Use Langflow when:
- designing reusable agent workflows
- prototyping orchestration logic
- building MCP-style tools or AI pipelines
- creating repeatable flows for Cinema Machina automation

Langflow is not the first tool for codebase summarization.

### 4. Browser Use
Use Browser Use when:
- browser automation is required
- a repeated website workflow should be automated
- web UI interaction is explicitly needed

Do not use Browser Use for repo analysis.

### 5. Postiz
Use Postiz when:
- generating or scheduling social media posts
- automating publishing pipelines
- integrating AI-created content into social scheduling workflows

Do not use Postiz for general project work.

## Token efficiency rules
- Prefer Graphify over scanning many files.
- Prefer existing repo docs under `docs/ai/`.
- Prefer targeted commands over broad recursive searches.
- Summarize findings before opening many files.
- Use only the tools needed for the task.

## Expected behavior for Codex
When asked repo-level questions, Codex should:
1. consult Graphify outputs
2. summarize from graph-level context
3. open only the exact files needed
4. state when Graphify was used
