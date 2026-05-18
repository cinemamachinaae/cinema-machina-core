import fs from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { repoPath } from "@/lib/paths";

function contentTypeFor(fileName: string): string {
  if (fileName.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (fileName.endsWith(".css")) return "text/css; charset=utf-8";
  if (fileName.endsWith(".json")) return "application/json; charset=utf-8";
  if (fileName.endsWith(".png")) return "image/png";
  if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) return "image/jpeg";
  if (fileName.endsWith(".svg")) return "image/svg+xml";
  return "application/octet-stream";
}

export async function GET(
  _req: Request,
  context: { params: { file: string } },
) {
  const fileName = context.params.file;
  if (!fileName || fileName.includes("..") || fileName.includes("/") || fileName.includes("\\")) {
    return new NextResponse("Invalid asset path.", { status: 400 });
  }

  const fullPath = repoPath("graphify-out", "orb-assets", fileName);
  try {
    const data = await fs.readFile(fullPath);
    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": contentTypeFor(fileName),
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new NextResponse("Not found.", { status: 404 });
  }
}

