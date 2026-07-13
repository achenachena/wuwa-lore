import { loadSiteHealthReports } from "@/lib/data";
import { isProduction } from "@/lib/security/headers";

export async function GET() {
  try {
    const { quality, validation, changes, sourceDiff } = await loadSiteHealthReports();

    if (!quality || !validation) {
      return Response.json({ ok: false }, { status: 503 });
    }

    const missingSourceRatio =
      quality.actualRows > 0 ? quality.missingSourceRows / quality.actualRows : 0;
    const ok = validation.ok && (sourceDiff?.summary.ok ?? true);

    if (isProduction()) {
      return Response.json({
        ok,
        generatedAt: validation.generatedAt,
        warnings: {
          highMissingSourceRatio: missingSourceRatio > 0.2,
        },
      });
    }

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
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
