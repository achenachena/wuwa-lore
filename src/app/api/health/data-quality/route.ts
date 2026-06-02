import {
  loadChangeReport,
  loadQualityReport,
  loadSourceDiffReport,
  loadValidationReport,
} from "@/lib/data/loaders";

export async function GET() {
  try {
    const [quality, validation, changes, sourceDiff] = await Promise.all([
      loadQualityReport(),
      loadValidationReport(),
      loadChangeReport().catch(() => null),
      loadSourceDiffReport().catch(() => null),
    ]);

    const missingSourceRatio =
      quality.actualRows > 0 ? quality.missingSourceRows / quality.actualRows : 0;
    const ok = validation.ok && (sourceDiff?.summary.ok ?? true);

    return Response.json({
      ok,
      warnings: {
        highMissingSourceRatio: missingSourceRatio > 0.2,
        missingSourceRows: quality.missingSourceRows,
        missingSourceRatio,
      },
      quality,
      validation: {
        ok: validation.ok,
        generatedAt: validation.generatedAt,
        identityErrors: validation.checks.identityValidation.errors.length,
        statErrors: validation.checks.statValidation.errors.length,
      },
      sourceDiff: sourceDiff
        ? {
            ok: sourceDiff.summary.ok,
            alignedDate: sourceDiff.summary.alignedDate ?? 0,
            mismatchedDate: sourceDiff.summary.mismatchedDate,
            missingInOfficial: sourceDiff.summary.missingInOfficial,
          }
        : null,
      changes,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 },
    );
  }
}
