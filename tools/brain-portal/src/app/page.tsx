"use client";

import { useEffect, useMemo, useState } from "react";

import { BottomPulseStrip } from "@/components/bottom-pulse-strip";
import { HeroOrbCanvas } from "@/components/hero-orb-canvas";
import { LeftControlRail } from "@/components/left-control-rail";
import { RightInspector } from "@/components/right-inspector";
import type {
  BrainPortalNode,
  BrainPortalStatus,
  GraphifyGraph,
  InspectorDetail,
  OrbSummaries,
  StatusLevel,
} from "@/lib/types";

function levelFromDirty(dirty?: boolean): StatusLevel {
  return dirty ? "warn" : "ok";
}

function rowsFromObject(entries: Array<[string, string | number | boolean | null | undefined]>) {
  return entries.map(([label, value]) => ({ label, value: value == null || value === "" ? "—" : String(value) }));
}

export default function BrainPortalHome() {
  const [status, setStatus] = useState<BrainPortalStatus | null>(null);
  const [graph, setGraph] = useState<GraphifyGraph | null>(null);
  const [summaries, setSummaries] = useState<OrbSummaries | null>(null);
  const [search, setSearch] = useState("");
  const [selectedNode, setSelectedNode] = useState<BrainPortalNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<BrainPortalNode | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<InspectorDetail | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [statusRes, graphRes, summariesRes] = await Promise.all([
          fetch("/api/status", { cache: "no-store" }),
          fetch("/api/graphify/graph", { cache: "no-store" }),
          fetch("/api/enrichment/summaries", { cache: "no-store" }),
        ]);

        if (!cancelled && statusRes.ok) {
          setStatus((await statusRes.json()) as BrainPortalStatus);
        }
        if (!cancelled && graphRes.ok) {
          setGraph((await graphRes.json()) as GraphifyGraph);
        }
        if (!cancelled && summariesRes.ok) {
          setSummaries((await summariesRes.json()) as OrbSummaries);
        }
      } catch {
        // Safe degraded state: UI stays up, strip will show "unknown".
      }
    }

    void load();
    const interval = window.setInterval(() => void load(), 10_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const effectiveHovered = useMemo(() => {
    if (isPinned) return null;
    return hoveredNode;
  }, [hoveredNode, isPinned]);

  const effectiveSelected = useMemo(() => {
    if (isPinned) return selectedNode;
    return selectedNode ?? effectiveHovered;
  }, [selectedNode, effectiveHovered, isPinned]);

  const graphMeta = useMemo(() => {
    if (!graph) return null;
    const nodes = graph.nodes?.length ?? 0;
    const links = graph.links?.length ?? 0;
    const communities = new Set(graph.nodes?.map((n) => n.community ?? "—") ?? []).size;
    return { nodes, links, communities };
  }, [graph]);

  const searchMatchCount = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query || !graph) return 0;
    return graph.nodes.filter((node) =>
      `${node.cleanLabel || node.label || ""} ${node.clusterName || ""} ${node.source_file || ""}`.toLowerCase().includes(query),
    ).length;
  }, [graph, search]);

  const makeDetail = (id: string): InspectorDetail => {
    const git = status?.git;
    const graphify = status?.graphify;
    const toolMap: Record<string, { title: string; tool: any; actions?: string[] }> = {
      ollama: {
        title: "Ollama / Qwen",
        tool: status?.ollama,
        actions: ["Use for local enrichment and concise code-aware summaries.", "If missing, start Ollama and pull qwen2.5-coder:7b."],
      },
      langflow: {
        title: "Langflow",
        tool: status?.langflow,
        actions: ["Configure LANGFLOW_API_KEY and a Cinema Machina flow endpoint before treating as integrated."],
      },
      ruflo: {
        title: "RuFlo",
        tool: status?.ruflo,
        actions: ["Validate with: ruflo workflow validate --file .claude-flow/workflows/cinema-machina-brain-check.json"],
      },
      codex: {
        title: "Codex Workspace",
        tool: status?.codexHooks,
        actions: ["Use Graphify first; preserve .codex/hooks.json and repo-root graphify-out."],
      },
      antigravity: {
        title: "Antigravity Workspace",
        tool: status?.antigravity,
        actions: ["Use .agents and skills-lock.json as workspace evidence; do not infer hidden activity."],
      },
      omega: {
        title: "OMEGA Memory",
        tool: status?.omega,
        actions: ["Optional unless a repo-level adapter is configured; do not report offline as an error."],
      },
      gemini: {
        title: "Gemini Audit",
        tool: status?.gemini,
        actions: ["Optional: run scripts/cm-gemini-audit.sh for long-context reports when GEMINI_API_KEY is present."],
      },
    };

    if (id === "git") {
      return {
        id,
        title: "Git Workspace",
        level: levelFromDirty(git?.dirty),
        summary: git?.dirty ? "Working tree has local changes." : "Working tree is clean.",
        rows: rowsFromObject([
          ["Branch", git?.head.branch],
          ["HEAD", git?.head.shortSha],
          ["Changed files", git?.changedFiles],
          ["Staged", git?.dirtySummary?.staged],
          ["Unstaged", git?.dirtySummary?.unstaged],
          ["Untracked", git?.dirtySummary?.untracked],
          ["Preview", git?.dirtySummary?.preview?.join(", ")],
          ["Last commit", git?.recentCommits?.[0] ? `${git.recentCommits[0].sha} ${git.recentCommits[0].subject}` : null],
        ]),
        actions: git?.dirty ? ["Review changed files before committing.", "Run git diff --name-only."] : ["Ready for a focused commit after verification."],
      };
    }

    if (id === "graph") {
      return {
        id,
        title: "Graphify Knowledge Graph",
        level: graphify?.matchesHead === true ? "ok" : graphify?.matchesHead === false ? "warn" : "unknown",
        summary: graphify?.matchesHead === true ? "Graphify metadata matches the current HEAD." : "Graphify may need refresh.",
        rows: rowsFromObject([
          ["Nodes", graphMeta?.nodes],
          ["Links", graphMeta?.links],
          ["Clusters", graphMeta?.communities],
          ["Built commit", graphify?.builtFromCommit],
          ["HEAD", git?.head.shortSha],
          ["Report", graphify?.graphReportPresent ? "present" : "missing"],
        ]),
        actions: ["Refresh with scripts/cm-graph-refresh.sh.", "Inspect graphify-out/AGENT_GRAPH_INDEX.md before broad repo search."],
      };
    }

    if (id === "reports") {
      return {
        id,
        title: "Brain Reports",
        level: "ok",
        summary: "Cached reports are read-only status inputs; expensive commands do not run inside /api/status.",
        rows: rowsFromObject([
          ["Brain check", status?.reports?.brainCheck.detail],
          ["Graph refresh", status?.reports?.graphRefresh.detail],
          ["Context refresh", status?.reports?.agentContextRefresh.detail],
          ["Graph report", status?.reports?.graphReport.present ? "present" : "missing"],
          ["Agent index", status?.reports?.agentIndex.present ? "present" : "missing"],
        ]),
        actions: ["Run scripts/cm-brain-check.sh for live readiness.", "Run scripts/cm-agent-context-refresh.sh after material changes."],
      };
    }

    if (id === "media") {
      return {
        id,
        title: "Plex / Jellyfin / Movie Library",
        level: "unknown",
        summary: "Brain Portal placeholders exist; no movie-library adapter is wired here yet.",
        rows: rowsFromObject([
          ["Plex", status?.mediaLibrary?.plex.detail],
          ["Jellyfin", status?.mediaLibrary?.jellyfin.detail],
          ["Movie library", status?.mediaLibrary?.movieLibrary.detail],
        ]),
        actions: ["Keep playback quality truth rules in Core adapters.", "Do not infer confirmed playback from Brain Portal placeholders."],
      };
    }

    const item = toolMap[id];
    if (item) {
      return {
        id,
        title: item.title,
        level: item.tool?.level ?? "unknown",
        summary: item.tool?.detail ?? "No status detail available.",
        rows: rowsFromObject([
          ["Status", item.tool?.status],
          ["Available", item.tool?.available],
          ["Model", item.tool?.model],
          ["Version", item.tool?.version],
          ["Base URL", item.tool?.base_url],
          ["Config", item.tool?.config],
          ["Workflow", item.tool?.workflow],
          ["Hook path", item.tool?.hookPath],
        ]),
        actions: item.actions,
      };
    }

    return {
      id,
      title: "Dashboard Detail",
      level: "unknown",
      summary: "No detail payload is available for this control.",
      rows: [],
    };
  };

  const selectDetail = (id: string) => {
    setSelectedDetail(makeDetail(id));
    setSelectedNode(null);
    setHoveredNode(null);
    setIsPinned(false);
  };

  return (
    <main className="relative min-h-[100dvh]">
      <HeroOrbCanvas
        graph={graph}
        search={search}
        onHover={(node) => setHoveredNode(node)}
        onSelect={(node) => {
          setSelectedDetail(null);
          setSelectedNode(node);
          setIsPinned(true);
        }}
        pinnedNode={isPinned ? selectedNode : null}
        resetSignal={resetSignal}
      />

      <div className="pointer-events-none absolute inset-0 z-[10]">
        <div className="pointer-events-auto absolute left-4 top-4 w-[min(340px,calc(100vw-32px))]">
          <LeftControlRail
            status={status}
            graphMeta={graphMeta}
            search={search}
            matchCount={searchMatchCount}
            resetMessage={resetMessage}
            onSearchChange={(value) => {
              setSearch(value);
              setResetMessage(null);
            }}
            onClearSearch={() => setSearch("")}
            onDetailSelect={selectDetail}
            onResetSelection={() => {
              setSearch("");
              setSelectedDetail(null);
              setSelectedNode(null);
              setHoveredNode(null);
              setIsPinned(false);
              setResetSignal((value) => value + 1);
              setResetMessage("Orb reset: camera, search, and selection cleared.");
            }}
            glow={search ? "cyan" : null}
          />
        </div>

        <div className="pointer-events-auto absolute right-4 top-4 w-[min(380px,calc(100vw-32px))]">
          <RightInspector
            status={status}
            graphMeta={graphMeta}
            detail={selectedDetail}
            node={effectiveSelected}
            pinnedNode={isPinned ? selectedNode : null}
            summaries={summaries}
            onDetailSelect={selectDetail}
            onUnpin={() => setIsPinned(false)}
            glow={selectedDetail ? "green" : isPinned ? "cyan" : effectiveHovered ? "blue" : null}
          />
        </div>

        <div className="pointer-events-auto absolute inset-x-0 bottom-0">
          <BottomPulseStrip status={status} onDetailSelect={selectDetail} />
        </div>
      </div>
    </main>
  );
}
