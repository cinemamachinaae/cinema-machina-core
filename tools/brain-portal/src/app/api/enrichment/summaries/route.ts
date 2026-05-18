import fs from "node:fs/promises";

import { NextResponse } from "next/server";

import { repoPath } from "@/lib/paths";
import type { OrbSummaries } from "@/lib/types";

type SidecarEnvelope = {
  generated_at_iso?: string;
  model?: string;
  summaries?: Record<string, string>;
};

async function readSidecar(fileName: string): Promise<SidecarEnvelope | null> {
  try {
    const text = await fs.readFile(repoPath("graphify-out", fileName), "utf-8");
    return JSON.parse(text) as SidecarEnvelope;
  } catch {
    return null;
  }
}

export async function GET() {
  const [community, nodes] = await Promise.all([
    readSidecar("orb-community-summaries.json"),
    readSidecar("orb-node-summaries.json"),
  ]);

  const payload: OrbSummaries = {
    communitySummaries: community?.summaries ?? null,
    nodeSummaries: nodes?.summaries ?? null,
    generatedAtIso: community?.generated_at_iso ?? nodes?.generated_at_iso ?? null,
    model: community?.model ?? nodes?.model ?? null,
  };

  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
}

