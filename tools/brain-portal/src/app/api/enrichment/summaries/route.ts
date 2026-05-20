import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { repoPath } from "@/lib/paths";
import type { OrbSummaries } from "@/lib/types";

type SidecarEnvelope = {
  generated_at_iso?: string;
  model?: string;
  summaries?: Record<string, string>;
};

let cachedPayload: OrbSummaries | null = null;
let cachedCommunityMtime = 0;
let cachedNodeMtime = 0;

async function getFileMtime(filePath: string): Promise<number> {
  try {
    const stat = await fs.stat(filePath);
    return stat.mtimeMs;
  } catch {
    return 0;
  }
}

async function readSidecar(filePath: string): Promise<SidecarEnvelope | null> {
  try {
    const text = await fs.readFile(filePath, "utf-8");
    return JSON.parse(text) as SidecarEnvelope;
  } catch {
    return null;
  }
}

const PREMIUM_COMMUNITY_SUMMARIES: Record<string, string> = {
  "0": "Brain Portal UI: The core visual control plane and web dashboard interface for Cinema Machina Core, exposing system-wide integration telemetry, agent-handoff logs, and the 3D intelligence orb.",
  "1": "Graphify / Orb Visualization: Knowledge graph generation, AST extraction, semantic analysis, and 3D Force Graph engine mapping out file and call relationships across the codebase.",
  "2": "Brain Ops / Context Pipeline: Automated workspace memory compiler, context packaging scripts, and periodic cron logic that builds consolidated environment contexts for LLMs and autonomous subagents.",
  "3": "Integrations: Connectors and adapters managing runtime integration with Qwen (Ollama), Langflow pipelines, and RuFlo execution layers.",
  "4": "Agent Handoff: Protocol schemas, handoff logs, hooks, and sync states facilitating collaboration between Codex, Antigravity, Claude Code, and OMEGA memory.",
  "5": "Docs / Config / Runtime: General documentation guides, configuration templates, environment files, build recipes, and system metadata.",
};

export async function GET() {
  const communityPath = repoPath("graphify-out", "orb-community-summaries.json");
  const nodePath = repoPath("graphify-out", "orb-node-summaries.json");

  const [communityMtime, nodeMtime] = await Promise.all([
    getFileMtime(communityPath),
    getFileMtime(nodePath),
  ]);

  if (cachedPayload && cachedCommunityMtime === communityMtime && cachedNodeMtime === nodeMtime) {
    return NextResponse.json(cachedPayload, {
      headers: {
        "Cache-Control": "no-store",
        "X-Summaries-Source": "cache",
      },
    });
  }

  const [community, nodes] = await Promise.all([
    readSidecar(communityPath),
    readSidecar(nodePath),
  ]);

  const mergedCommunities = {
    ...PREMIUM_COMMUNITY_SUMMARIES,
    ...(community?.summaries ?? {}),
  };

  const payload: OrbSummaries = {
    communitySummaries: mergedCommunities,
    nodeSummaries: nodes?.summaries ?? null,
    generatedAtIso: community?.generated_at_iso ?? nodes?.generated_at_iso ?? null,
    model: community?.model ?? nodes?.model ?? null,
  };

  cachedPayload = payload;
  cachedCommunityMtime = communityMtime;
  cachedNodeMtime = nodeMtime;

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store",
      "X-Summaries-Source": "disk",
    },
  });
}

