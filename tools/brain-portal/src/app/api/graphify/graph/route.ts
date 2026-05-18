import fs from "node:fs/promises";

import { NextResponse } from "next/server";

import { repoPath } from "@/lib/paths";
import type { GraphifyGraph } from "@/lib/types";

export async function GET() {
  const graphPath = repoPath("graphify-out", "graph.json");
  try {
    const text = await fs.readFile(graphPath, "utf-8");
    const parsed = JSON.parse(text) as GraphifyGraph;

    // Basic integrity guardrails: ensure arrays exist.
    const safe: GraphifyGraph = {
      nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
      links: Array.isArray(parsed.links) ? parsed.links : [],
    };

    return NextResponse.json(safe, { headers: { "Cache-Control": "no-store" } });
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

