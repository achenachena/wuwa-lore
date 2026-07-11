import { NextResponse } from "next/server";
import { isProduction } from "@/lib/security/headers";

/** Shared headers for large derived-data export endpoints. */
export function exportHeaders(filename: string, contentType = "application/json"): HeadersInit {
  return {
    "content-type": contentType,
    "content-disposition": `attachment; filename="${filename}"`,
    "cache-control": isProduction()
      ? "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400"
      : "no-store",
  };
}

export function jsonExport(body: unknown, filename: string): NextResponse {
  return NextResponse.json(body, { headers: exportHeaders(filename) });
}
