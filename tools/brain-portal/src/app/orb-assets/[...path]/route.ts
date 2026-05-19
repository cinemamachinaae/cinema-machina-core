import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse, NextRequest } from "next/server";
import { repoPath } from "@/lib/paths";

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const assetPath = params.path.join("/");
    
    // Resolve the full path and ensure it's within orb-assets to prevent directory traversal
    const baseOrbAssetsPath = repoPath("graphify-out", "orb-assets");
    const fullPath = path.resolve(baseOrbAssetsPath, assetPath);
    
    if (!fullPath.startsWith(baseOrbAssetsPath)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const content = await fs.readFile(fullPath);
    
    let contentType = "application/octet-stream";
    if (fullPath.endsWith(".js")) contentType = "application/javascript";
    else if (fullPath.endsWith(".css")) contentType = "text/css";
    else if (fullPath.endsWith(".json")) contentType = "application/json";

    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    return new NextResponse("Asset not found.", { status: 404 });
  }
}
