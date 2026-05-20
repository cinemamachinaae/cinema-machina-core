# Agent Query Cheatsheet — Cinema Machina Core

This cheatsheet provides quick instructions on how to use Graphify, grep, and index-based searches to explore the repository.

---

## 1. Finding Files by Macro-Section

Because every file is categorized under a `macroSectionId` (0-5), you can easily query files within specific scopes using ripgrep or node filters:

### Graph Query Commands
To query files within the **Integrations** section (ID 3):
```bash
# Finds nodes with macroSectionId = 3 in graph.json
jq '.nodes[] | select(.macroSectionId == 3) | .id' graphify-out/graph.json
```

To list all files in the **Agent Handoff** section (ID 4):
```bash
jq '.nodes[] | select(.macroSectionId == 4) | {file: .id, label: .label}' graphify-out/graph.json
```

---

## 2. Querying by Subcluster Type

To filter only routes or components across the repository:

### Find all route handlers:
```bash
jq '.nodes[] | select(.subcluster == "routes") | .id' graphify-out/graph.json
```

### Find all UI components:
```bash
jq '.nodes[] | select(.subcluster == "components") | .id' graphify-out/graph.json
```

### Find all adapters:
```bash
jq '.nodes[] | select(.subcluster == "adapters") | .id' graphify-out/graph.json
```

---

## 3. AST Query Shortcuts

For native Graphify commands, you can inspect the graph edges to trace dependencies:
- To find all dependencies of a file:
  ```bash
  jq '.links[] | select(.source == "tools/brain-portal/src/app/api/status/route.ts") | .target' graphify-out/graph.json
  ```
- To find everything that imports a file:
  ```bash
  jq '.links[] | select(.target == "tools/brain-portal/src/lib/types.ts") | .source' graphify-out/graph.json
  ```
