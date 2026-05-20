import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { repoPath } from "@/lib/paths";
import type { GraphifyGraph, BrainPortalNode } from "@/lib/types";

let cachedGraph: GraphifyGraph | null = null;
let cachedMtime: number = 0;

function getMacroSectionAndSubcluster(node: any): { macroSectionId: number; macroSectionLabel: string; subcluster: string } {
  const source = String(node.source || "").trim();
  const id = String(node.id || "").trim();

  let macroSectionId = 5;
  let macroSectionLabel = "Docs / Config / Runtime";
  let subcluster = "other";

  const pathLower = String(node.source_file || node.source || node.id || "").toLowerCase();

  // 1. Brain Portal UI
  if (
    pathLower.includes("tools/brain-portal/src/components") ||
    pathLower.includes("tools/brain-portal/src/app") ||
    pathLower.includes("tools/brain-portal/src/lib") ||
    pathLower.includes("tools/brain-portal/src/hooks") ||
    pathLower.includes("tools/brain-portal/src/context")
  ) {
    macroSectionId = 0;
    macroSectionLabel = "Brain Portal UI";
    if (pathLower.includes("/components/")) {
      subcluster = "components";
    } else if (pathLower.includes("/api/")) {
      subcluster = "routes";
    } else {
      subcluster = "components";
    }
  }
  // 2. Graphify / Orb Visualization
  else if (
    pathLower.includes("graphify") ||
    pathLower.includes("graph_report") ||
    pathLower.includes("enrich-graphify")
  ) {
    macroSectionId = 1;
    macroSectionLabel = "Graphify / Orb Visualization";
    if (pathLower.endsWith(".md")) {
      subcluster = "docs";
    } else if (pathLower.includes("route") || pathLower.includes("/api/")) {
      subcluster = "routes";
    } else if (pathLower.endsWith(".json")) {
      subcluster = "generated-artifacts";
    } else {
      subcluster = "scripts";
    }
  }
  // 3. Brain Ops / Context Pipeline
  else if (
    pathLower.includes("tools/brain-ops") ||
    pathLower.includes("run_brain_cycle") ||
    pathLower.includes("build_agent_pack")
  ) {
    macroSectionId = 2;
    macroSectionLabel = "Brain Ops / Context Pipeline";
    if (pathLower.endsWith(".sh") || pathLower.endsWith(".py") || pathLower.endsWith(".mjs")) {
      subcluster = "scripts";
    } else if (pathLower.endsWith(".md") || pathLower.endsWith(".txt")) {
      subcluster = "generated-artifacts";
    } else {
      subcluster = "scripts";
    }
  }
  // 4. Integrations: Qwen, Langflow, RuFlo
  else if (
    pathLower.includes("ollama") ||
    pathLower.includes("qwen") ||
    pathLower.includes("langflow") ||
    pathLower.includes("ruflo")
  ) {
    macroSectionId = 3;
    macroSectionLabel = "Integrations";
    if (pathLower.includes("adapter")) {
      subcluster = "adapters";
    } else if (pathLower.endsWith(".toml") || pathLower.endsWith(".yaml") || pathLower.endsWith(".json")) {
      subcluster = "docs";
    } else {
      subcluster = "adapters";
    }
  }
  // 5. Agent Handoff: Codex, Antigravity, Claude Code
  else if (
    pathLower.includes("codex") ||
    pathLower.includes("antigravity") ||
    pathLower.includes("claude") ||
    pathLower.includes("omega") ||
    pathLower.includes(".agents")
  ) {
    macroSectionId = 4;
    macroSectionLabel = "Agent Handoff";
    if (pathLower.endsWith(".md")) {
      subcluster = "docs";
    } else if (pathLower.endsWith(".json") || pathLower.includes(".claudecode")) {
      subcluster = "generated-artifacts";
    } else {
      subcluster = "generated-artifacts";
    }
  }
  // 6. Docs / Config / Runtime (Fallback default)
  else {
    macroSectionId = 5;
    macroSectionLabel = "Docs / Config / Runtime";
    if (pathLower.endsWith(".md")) {
      subcluster = "docs";
    } else if (
      pathLower.endsWith(".toml") ||
      pathLower.endsWith(".json") ||
      pathLower.includes(".env") ||
      pathLower.includes("package.json") ||
      pathLower.includes("next.config") ||
      pathLower.includes("tsconfig.json")
    ) {
      subcluster = "docs";
    } else if (pathLower.includes("backend/app/")) {
      subcluster = "adapters";
    } else {
      subcluster = "runtime";
    }
  }

  return { macroSectionId, macroSectionLabel, subcluster };
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
  "docs/ai/AI_BRAIN_TEMPLATE.md": "AI Project Brain Template",
  "docs/ai/QWEN_LOCAL_ROLE.md": "Qwen Local Role Docs",
  "docs/ai/BRAIN_STACK.md": "Brain Stack Docs",
  "docs/ai/TOOLCHAIN_ROUTING.md": "Toolchain Routing Docs",
  "docs/ai/PROJECT_STATE.md": "Project State Docs",
  "docs/ai/TASK_LOG.md": "Task Log Docs",
  "docs/ai/DECISIONS.md": "Decisions Docs",
  "docs/ai/KNOWN_ISSUES.md": "Known Issues Docs",
  "docs/ai/ENVIRONMENT_MAP.md": "Environment Map Docs",
  "docs/ai/SERVER_AND_DEVICE_CONTEXT.md": "Server & Device Context Docs",
  "docs/ai/API_AND_INTEGRATIONS.md": "API & Integrations Docs",
  "docs/ai/ARCHITECTURE_OVERVIEW.md": "Architecture Overview Docs",
  "docs/ai/PRODUCT_AND_BRAND_CONTEXT.md": "Product & Brand Context Docs",
  ".codex/hooks.json": "Codex Git Hooks Config",
  "skills-lock.json": "Agent Skills Registry",
  "package.json": "Workspace Configuration",
  "next.config.mjs": "Next.js Configuration",
  "tsconfig.json": "TypeScript Config",
  "tools/brain-portal/src/lib/types.ts": "Brain Portal Types",
  "tools/brain-portal/src/lib/paths.ts": "Repo Path Utilities",
  "tools/brain-portal/src/lib/safe-exec.ts": "Safe Command Executor",
  "backend/requirements.txt": "Python Backend Dependencies",
};

const getBasename = (filePath: string) => {
  const parts = filePath.split("/");
  return parts[parts.length - 1] || filePath;
};

function getCleanNodeLabel(node: any): string {
  let cleanLabel = node.label || node.id || "unknown";
  const sourceFile = node.source_file || "";
  const isFileNode = node.source_location === "L1" || !node.source_location || node.source_location === "";
  
  if (isFileNode) {
    if (sourceFile && FRIENDLY_LABELS[sourceFile]) {
      return FRIENDLY_LABELS[sourceFile];
    } else if (sourceFile) {
      return getBasename(sourceFile);
    }
  } else {
    const baseName = sourceFile ? getBasename(sourceFile) : "";
    if (baseName) {
      return `${baseName} : ${cleanLabel}`;
    }
  }
  return cleanLabel;
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
    const mappedNodes: BrainPortalNode[] = rawNodes.map((node) => {
      const info = getMacroSectionAndSubcluster(node);
      
      // Let's amplify node importance dynamically if they are important files
      let baseVal = node.val ?? 4;
      const isFileNode = node.source_location === "L1" || !node.source_location || node.source_location === "";
      
      const isImportantFile = isFileNode && (
        node.source_file?.endsWith("/page.tsx") ||
        node.source_file?.endsWith("/route.ts") ||
        node.source_file?.endsWith("/layout.tsx") ||
        node.source_file?.includes("adapter.py") ||
        node.source_file?.includes("run_brain_cycle.sh") ||
        node.source_file?.includes("AGENT_HANDOFF.md") ||
        node.source_file?.includes("GRAPH_REPORT.md")
      );

      if (isImportantFile) {
        baseVal = Math.max(baseVal, 18);
      }

      // Preserve original community, set graphifyCommunity, macroSectionId, and macroSectionLabel
      const origCommunity = node.community !== undefined ? node.community : 5;

      return {
        ...node,
        label: getCleanNodeLabel(node),
        community: origCommunity,
        graphifyCommunity: origCommunity,
        macroSectionId: info.macroSectionId,
        macroSectionLabel: info.macroSectionLabel,
        subcluster: info.subcluster,
        val: baseVal,
      };
    });

    const safe: GraphifyGraph = {
      nodes: mappedNodes,
      links: Array.isArray(parsed.links) ? parsed.links : [],
    };

    cachedGraph = safe;
    cachedMtime = mtime;

    return NextResponse.json(safe, {
      headers: {
        "Cache-Control": "no-store",
        "X-Graph-Source": "disk",
      },
    });
  } catch (error) {
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

