import { isProduction } from "@/lib/security/headers";

type SourceDiffSummary = {
  generatedAt: string;
  summary: {
    ok: boolean;
    alignedDate?: number;
    mismatchedDate: number;
    missingInOfficial: number;
    fandomVersionCount: number;
  };
};

export function trimSourceDiffForProduction<T extends SourceDiffSummary>(report: T) {
  if (!isProduction()) {
    return report;
  }
  return {
    generatedAt: report.generatedAt,
    summary: report.summary,
  };
}
