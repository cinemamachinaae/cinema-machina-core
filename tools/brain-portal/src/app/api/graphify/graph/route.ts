import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { repoPath } from "@/lib/paths";
import type { BrainPortalNode, GraphifyGraph } from "@/lib/types";

let cachedGraph: GraphifyGraph | null = null;
let cachedMtime = 0;

type BusinessCluster = {
  id: number;
  name: string;
  group: string;
  description: string;
  color: string;
};

const BUSINESS_CLUSTERS: BusinessCluster[] = [
  { id: 0, name: "Cinema Machina AI Brain", group: "brain", description: "Brain Portal, status telemetry, context packs, dashboard control plane.", color: "#7CA9FF" },
  { id: 1, name: "Cinema Machina Core", group: "core", description: "Core local-first backend, scripts, APIs, and product runtime.", color: "#66E3B4" },
  { id: 2, name: "Cinema Machina Website", group: "web", description: "Public website, Vercel surfaces, and web presentation references.", color: "#C69CFF" },
  { id: 3, name: "AI Tools and Agents", group: "agents", description: "Generic agent tooling, model docs, workflows, and orchestration notes.", color: "#E6C26E" },
  { id: 4, name: "Codex Workspace", group: "agents", description: "Codex hooks, prompts, skills, and repo workflow guidance.", color: "#9DBBFF" },
  { id: 5, name: "Antigravity Workspace", group: "agents", description: "Antigravity .agents workspace, skills, and workflow artifacts.", color: "#E07AA6" },
  { id: 6, name: "Local AI / Qwen / Ollama", group: "local-ai", description: "Local Ollama runtime, Qwen model, and enrichment pipeline.", color: "#46D7C8" },
  { id: 7, name: "Langflow Orchestration", group: "local-ai", description: "Langflow daemon, flow endpoint readiness, and orchestration adapter.", color: "#8DEBFF" },
  { id: 8, name: "RuFlo Workflows", group: "local-ai", description: "RuFlo CLI, repo workflow validation, and .claude-flow configuration.", color: "#FFB86B" },
  { id: 9, name: "Graphify Knowledge Graph", group: "graph", description: "Graphify outputs, graph reports, cluster maps, and graph refresh automation.", color: "#00E5FF" },
  { id: 10, name: "GitHub / Vercel / Repos", group: "repos", description: "Git state, GitHub remote workflows, Vercel references, and repo metadata.", color: "#B7C4D9" },
  { id: 11, name: "Plex / Jellyfin / Movie Library", group: "media", description: "Media server adapters, movie library health, and playback source context.", color: "#8FE388" },
  { id: 12, name: "Home Cinema / Client Signal Chain", group: "cinema", description: "Shield, playback client, audio passthrough, codecs, and client signal chain.", color: "#F2D394" },
  { id: 13, name: "Docs / Config / Runtime", group: "support", description: "Fallback documentation, configuration, package setup, and runtime support files.", color: "#C9D2E3" },
];

const CLUSTER_BY_ID = new Map(BUSINESS_CLUSTERS.map((cluster) => [cluster.id, cluster]));

function cluster(id: number): BusinessCluster {
  return CLUSTER_BY_ID.get(id) ?? BUSINESS_CLUSTERS[13];
}

function getTextForClassification(node: any): string {
  return [
    node.source_file,
    node.source,
    node.id,
    node.label,
    node.type,
  ].filter(Boolean).join(" ").toLowerCase();
}

function classifyBusinessCluster(node: any): BusinessCluster {
  const text = getTextForClassification(node);

  if (/(langflow)/i.test(text)) return cluster(7);
  if (/(ruflo|\.claude-flow|claude-flow)/i.test(text)) return cluster(8);
  if (/(ollama|qwen|local model|local-ai)/i.test(text)) return cluster(6);
  if (/(graphify-out|graphify|graph_report|graph report|cluster-map|agent-query-cheatsheet|cm-graph-refresh)/i.test(text)) return cluster(9);
  if (/(codex|\.codex|hooks\.json|prompt)/i.test(text)) return cluster(4);
  if (/(\.agents|antigravity|skills-lock|skills\/|workflow)/i.test(text)) return cluster(5);
  if (/(plex|jellyfin|radarr|sonarr|prowlarr|trailarr|bazarr|movie library|movies)/i.test(text)) return cluster(11);
  if (/(shield|home cinema|client signal|signal chain|audio passthrough|truehd|dts|atmos|dolby|hdr|soundbar|adb)/i.test(text)) return cluster(12);
  if (/(github|git\b|vercel|repo|origin\/main|remote)/i.test(text)) return cluster(10);
  if (/(website|cinemamachinaae\/web|frontend\/|vercel web|public website)/i.test(text)) return cluster(2);
  if (/(tools\/brain-portal|brain portal|status route|dashboard|agent-context-pack|context pack|brain-ops|cm-brain-check|cm-agent-context)/i.test(text)) return cluster(0);
  if (/(backend\/app|backend\/tests|\/health|system\/overview|playback|chain\/current|devices\/shield|core)/i.test(text)) return cluster(1);
  if (/(ai tool|agent|model|gemini|claude|openai|memory|orchestration)/i.test(text)) return cluster(3);
  return cluster(13);
}

function getMacroSectionAndSubcluster(node: any): { macroSectionId: number; macroSectionLabel: string; macroSectionName: string; subcluster: string } {
  const pathLower = String(node.source_file || node.source || node.id || "").toLowerCase();

  let macroSectionId = 5;
  let macroSectionLabel = "Docs / Config / Runtime";
  let subcluster = "other";

  if (
    pathLower.includes("tools/brain-portal/src/components") ||
    pathLower.includes("tools/brain-portal/src/app") ||
    pathLower.includes("tools/brain-portal/src/lib") ||
    pathLower.includes("tools/brain-portal/src/hooks") ||
    pathLower.includes("tools/brain-portal/src/context")
  ) {
    macroSectionId = 0;
    macroSectionLabel = "Brain Portal UI";
    subcluster = pathLower.includes("/api/") ? "routes" : "components";
  } else if (
    pathLower.includes("graphify") ||
    pathLower.includes("graph_report") ||
    pathLower.includes("enrich-graphify") ||
    pathLower.includes("cm-graph-refresh")
  ) {
    macroSectionId = 1;
    macroSectionLabel = "Graphify / Orb Visualization";
    if (pathLower.endsWith(".md")) subcluster = "docs";
    else if (pathLower.includes("route") || pathLower.includes("/api/")) subcluster = "routes";
    else if (pathLower.endsWith(".json")) subcluster = "generated-artifacts";
    else subcluster = "scripts";
  } else if (
    pathLower.includes("tools/brain-ops") ||
    pathLower.includes("run_brain_cycle") ||
    pathLower.includes("build_agent_pack") ||
    pathLower.includes("cm-agent-context") ||
    pathLower.includes("cm-brain-check")
  ) {
    macroSectionId = 2;
    macroSectionLabel = "Brain Ops / Context Pipeline";
    subcluster = pathLower.endsWith(".md") || pathLower.endsWith(".txt") ? "generated-artifacts" : "scripts";
  } else if (
    pathLower.includes("ollama") ||
    pathLower.includes("qwen") ||
    pathLower.includes("langflow") ||
    pathLower.includes("ruflo")
  ) {
    macroSectionId = 3;
    macroSectionLabel = "Integrations";
    subcluster = pathLower.includes("adapter") ? "adapters" : "runtime";
  } else if (
    pathLower.includes("codex") ||
    pathLower.includes("antigravity") ||
    pathLower.includes("claude") ||
    pathLower.includes("omega") ||
    pathLower.includes(".agents")
  ) {
    macroSectionId = 4;
    macroSectionLabel = "Agent Handoff";
    subcluster = pathLower.endsWith(".md") ? "docs" : "generated-artifacts";
  } else {
    macroSectionId = 5;
    macroSectionLabel = "Docs / Config / Runtime";
    if (pathLower.endsWith(".md")) subcluster = "docs";
    else if (
      pathLower.endsWith(".toml") ||
      pathLower.endsWith(".json") ||
      pathLower.includes(".env") ||
      pathLower.includes("package.json") ||
      pathLower.includes("next.config") ||
      pathLower.includes("tsconfig.json")
    ) subcluster = "docs";
    else if (pathLower.includes("backend/app/")) subcluster = "adapters";
    else subcluster = "runtime";
  }

  return { macroSectionId, macroSectionLabel, macroSectionName: macroSectionLabel, subcluster };
}

const FRIENDLY_LABELS: Record<string, string> = {
  "tools/brain-portal/src/app/page.tsx": "Brain Portal Home",
  "tools/brain-portal/src/components/hero-orb-canvas.tsx": "Hero Orb Canvas",
  "tools/brain-portal/src/components/right-inspector.tsx": "Right Inspector Panel",
  "tools/brain-portal/src/components/left-control-rail.tsx": "Left Control Rail",
  "tools/brain-portal/src/components/bottom-pulse-strip.tsx": "Bottom Pulse Strip",
  "tools/brain-portal/src/components/panel.tsx": "Dashboard Panel Component",
  "tools/brain-portal/src/app/api/status/route.ts": "Status Telemetry API",
  "tools/brain-portal/src/app/api/graphify/graph/route.ts": "Graphify Graph API",
  "tools/brain-portal/src/app/api/enrichment/summaries/route.ts": "Orb Summaries API",
  "backend/langflow_adapter.py": "Langflow Integration Adapter",
  "backend/ruflo_adapter.py": "RuFlo Integration Adapter",
  "tools/brain-ops/build_agent_pack.py": "Context Pack Builder",
  "tools/brain-ops/run_brain_cycle.sh": "Brain Cycle Orchestrator",
  "docs/AGENT_HANDOFF.md": "Agent Handoff Protocol",
  "graphify-out/GRAPH_REPORT.md": "Graphify Architecture Report",
  "tools/brain-portal/tools/brain-ops/data/context/agent-context-pack.md": "Agent Context Pack",
  ".codex/hooks.json": "Codex Git Hooks Config",
  ".claude-flow/workflows/cinema-machina-brain-check.json": "RuFlo Brain Check Workflow",
  "skills-lock.json": "Agent Skills Registry",
};

function getBasename(filePath: string) {
  const parts = filePath.split("/");
  return parts[parts.length - 1] || filePath;
}

function isFileNode(node: any): boolean {
  return node.source_location === "L1" || !node.source_location || node.source_location === "";
}

function getCleanNodeLabel(node: any): string {
  const sourceFile = node.source_file || "";
  if (isFileNode(node)) {
    if (sourceFile && FRIENDLY_LABELS[sourceFile]) return FRIENDLY_LABELS[sourceFile];
    if (sourceFile) return getBasename(sourceFile);
  }

  const cleanLabel = node.label || node.id || "unknown";
  const baseName = sourceFile ? getBasename(sourceFile) : "";
  return !isFileNode(node) && baseName ? `${baseName} : ${cleanLabel}` : cleanLabel;
}

function sourceKindFor(node: any): BrainPortalNode["sourceKind"] {
  const sourceFile = String(node.source_file || node.source || node.id || "").toLowerCase();
  if (node.isClusterHub) return "virtual-hub";
  if (sourceFile.endsWith(".md") || sourceFile.endsWith(".txt")) return "doc";
  if (sourceFile.endsWith(".json") || sourceFile.endsWith(".toml") || sourceFile.endsWith(".yaml") || sourceFile.endsWith(".yml")) return "config";
  if (isFileNode(node)) return "file";
  if (node.source_file) return "symbol";
  if (sourceFile.includes("runtime") || sourceFile.includes("node_modules")) return "runtime";
  return "unknown";
}

function actionSummary(node: any, cleanLabel: string, businessCluster: BusinessCluster, sourceKind: string): string {
  if (sourceKind === "virtual-hub") return `Cluster hub for ${businessCluster.name}. Select nodes around it to inspect concrete files and symbols.`;
  const source = node.source_file || node.source || node.id || "unknown source";
  if (sourceKind === "file" || sourceKind === "doc" || sourceKind === "config") {
    return `Open ${source} to inspect ${cleanLabel} in the ${businessCluster.name} cluster.`;
  }
  return `Inspect ${cleanLabel} from ${source}; classify impact under ${businessCluster.name}.`;
}

function importanceFor(node: any, baseVal: number, businessCluster: BusinessCluster): number {
  const source = String(node.source_file || node.source || node.id || "").toLowerCase();
  let importance = Math.max(1, Math.round(baseVal));
  if (
    source.endsWith("/page.tsx") ||
    source.endsWith("/route.ts") ||
    source.endsWith("/layout.tsx") ||
    source.includes("adapter.py") ||
    source.includes("cm-brain-check") ||
    source.includes("cm-graph-refresh") ||
    source.includes("agent_handoff") ||
    source.includes("graph_report")
  ) {
    importance = Math.max(importance, 22);
  }
  if ([0, 1, 9].includes(businessCluster.id)) importance += 2;
  return importance;
}

function enrichNode(node: any): BrainPortalNode {
  const macro = getMacroSectionAndSubcluster(node);
  const businessCluster = classifyBusinessCluster(node);
  const cleanLabel = getCleanNodeLabel(node);
  const origCommunity = node.community !== undefined ? node.community : 5;
  const baseVal = node.val ?? 4;
  const sourceKind = sourceKindFor(node);
  const importance = importanceFor(node, baseVal, businessCluster);

  return {
    ...node,
    label: cleanLabel,
    cleanLabel,
    community: origCommunity,
    graphifyCommunity: origCommunity,
    macroSectionId: macro.macroSectionId,
    macroSectionLabel: macro.macroSectionLabel,
    macroSectionName: macro.macroSectionName,
    clusterId: businessCluster.id,
    clusterName: businessCluster.name,
    clusterGroup: businessCluster.group,
    clusterDescription: businessCluster.description,
    subcluster: macro.subcluster || "other",
    sourceKind,
    importance,
    actionableSummary: actionSummary(node, cleanLabel, businessCluster, sourceKind),
    val: Math.max(baseVal, Math.min(28, importance)),
  };
}

function buildClusterHubs(nodes: BrainPortalNode[]): { hubs: BrainPortalNode[]; links: GraphifyGraph["links"] } {
  const hubs: BrainPortalNode[] = [];
  const links: GraphifyGraph["links"] = [];

  for (const businessCluster of BUSINESS_CLUSTERS) {
    const clusterNodes = nodes
      .filter((node) => node.clusterId === businessCluster.id)
      .sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0))
      .slice(0, 6);

    const hubId = `__cluster_hub_${businessCluster.id}`;
    hubs.push({
      id: hubId,
      label: businessCluster.name,
      cleanLabel: businessCluster.name,
      type: "cluster-hub",
      community: `business-${businessCluster.id}`,
      graphifyCommunity: `business-${businessCluster.id}`,
      macroSectionId: 5,
      macroSectionLabel: businessCluster.name,
      macroSectionName: businessCluster.name,
      clusterId: businessCluster.id,
      clusterName: businessCluster.name,
      clusterGroup: businessCluster.group,
      clusterDescription: businessCluster.description,
      subcluster: "hub",
      sourceKind: "virtual-hub",
      importance: 100,
      actionableSummary: `Business cluster hub for ${businessCluster.name}. ${businessCluster.description}`,
      isClusterHub: true,
      val: 34,
    });

    for (const node of clusterNodes) {
      links.push({
        source: hubId,
        target: node.id,
        label: "cluster-hub",
      });
    }
  }

  return { hubs, links };
}

export async function GET() {
  const graphPath = repoPath("graphify-out", "graph.json");
  try {
    const stat = await fs.stat(graphPath);
    const mtime = stat.mtimeMs;

    if (cachedGraph && cachedMtime === mtime) {
      return NextResponse.json(cachedGraph, {
        headers: {
          "Cache-Control": "no-store",
          "X-Graph-Source": "cache",
        },
      });
    }

    const text = await fs.readFile(graphPath, "utf-8");
    const parsed = JSON.parse(text) as GraphifyGraph;

    const rawNodes = Array.isArray(parsed.nodes) ? parsed.nodes : [];
    const mappedNodes = rawNodes.map(enrichNode);
    const { hubs, links: hubLinks } = buildClusterHubs(mappedNodes);

    const safe: GraphifyGraph = {
      nodes: [...mappedNodes, ...hubs],
      links: [...(Array.isArray(parsed.links) ? parsed.links : []), ...hubLinks],
    };

    cachedGraph = safe;
    cachedMtime = mtime;

    return NextResponse.json(safe, {
      headers: {
        "Cache-Control": "no-store",
        "X-Graph-Source": "disk",
      },
    });
  } catch {
    return NextResponse.json(
      {
        nodes: [],
        links: [],
        error: "graph.json is missing or unreadable",
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }
}
