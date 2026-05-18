import fs from "node:fs/promises";

import { NextResponse } from "next/server";

import { repoPath } from "@/lib/paths";

export async function GET() {
  try {
    const html = await fs.readFile(
      repoPath("graphify-out", "Cinema-Machina-Core-Orb-Brain-3D.html"),
      "utf-8",
    );
    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new NextResponse("Orb HTML not found.", { status: 404 });
  }
}

