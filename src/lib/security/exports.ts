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

export function escapeCsvCell(value: string | number | boolean): string {
  const text = String(value);
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function toCsv(headers: string[], rows: Array<Array<string | number | boolean>>): string {
  const lines = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => escapeCsvCell(cell)).join(",")),
  ];
  return `${lines.join("\n")}\n`;
}

export function csvExport(
  headers: string[],
  rows: Array<Array<string | number | boolean>>,
  filename: string,
): Response {
  return new Response(toCsv(headers, rows), {
    headers: exportHeaders(filename, "text/csv; charset=utf-8"),
  });
}
