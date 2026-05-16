# Graph Report - Cinema Machina Core  (2026-05-16)

## Corpus Check
- 33 files · ~7,386 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 31 nodes · 22 edges · 9 communities (3 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1dcac6a8`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]

## God Nodes (most connected - your core abstractions)
1. `Format` - 5 edges
2. `Cinema Machina Core — Environment Map` - 3 edges
3. `Cinema Machina Core — Project State` - 3 edges
4. `Cinema Machina Core — API and Integrations` - 2 edges
5. `Cinema Machina Core — Decisions` - 2 edges
6. `Cinema Machina Core — Known Issues` - 2 edges
7. `Cinema Machina — Server and Device Context` - 2 edges
8. `Cinema Machina Core — Task Log` - 2 edges
9. `graphify` - 1 edges
10. `Workflow: graphify` - 1 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities (9 total, 6 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.29
Nodes (6): Cinema Machina Core — Decisions, Decision, Format, Status, Tradeoffs, Why

### Community 1 - "Community 1"
Cohesion: 0.5
Nodes (3): Cinema Machina Core — Environment Map, Local AI/code tools confirmed installed on MacBook, Notes

### Community 2 - "Community 2"
Cohesion: 0.5
Nodes (3): Active priorities, Cinema Machina Core — Project State, Current status

## Knowledge Gaps
- **14 isolated node(s):** `graphify`, `Workflow: graphify`, `Rules`, `Decision`, `Why` (+9 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `graphify`, `Workflow: graphify`, `Rules` to the rest of the system?**
  _14 weakly-connected nodes found - possible documentation gaps or missing edges._