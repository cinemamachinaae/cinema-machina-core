import { NextRequest, NextResponse } from "next/server";

/**
 * /orb is deprecated. The Brain Portal is a single-page experience at /.
 * Redirect any direct /orb requests back to the main portal.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/";
  return NextResponse.redirect(url, { status: 308 });
}
