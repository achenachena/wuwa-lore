import { cache } from "react";

import {
  loadChangeReport,
  loadQualityReport,
  loadSourceDiffReport,
  loadValidationReport,
} from "@/lib/data/loaders";

export const loadSiteHealthReports = cache(async () => {
  const [quality, validation, sourceDiff, changes] = await Promise.all([
    loadQualityReport().catch(() => null),
    loadValidationReport().catch(() => null),
    loadSourceDiffReport().catch(() => null),
    loadChangeReport().catch(() => null),
  ]);
  return { quality, validation, sourceDiff, changes };
});
