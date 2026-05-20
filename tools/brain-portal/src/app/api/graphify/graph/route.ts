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

  const pathLower = source.toLowerCase() || id.toLowerCase();

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
      const isImportantFile =
        node.id?.endsWith("/page.tsx") ||
        node.id?.endsWith("/route.ts") ||
        node.id?.endsWith("/layout.tsx") ||
        node.id?.includes("adapter.py") ||
        node.id?.includes("run_brain_cycle.sh") ||
        node.id?.includes("AGENT_HANDOFF.md") ||
        node.id?.includes("GRAPH_REPORT.md");

      if (isImportantFile) {
        baseVal = Math.max(baseVal, 16);
      }

      // Preserve original community, set graphifyCommunity, macroSectionId, and macroSectionLabel
      const origCommunity = node.community !== undefined ? node.community : 5;

      return {
        ...node,
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

