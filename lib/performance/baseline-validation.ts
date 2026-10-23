import type { BaselineReport } from './lighthouse-auditor';

export function assertComparableBaseline(
  value: unknown,
  baseUrl: string,
  routes: readonly string[]
): asserts value is BaselineReport {
  if (!value || typeof value !== 'object') {
    throw new Error('Invalid Lighthouse baseline. Run npm run lighthouse:baseline first.');
  }

  const baseline = value as Partial<BaselineReport>;
  if (
    baseline.provenance?.source !== 'measured' ||
    baseline.provenance.generator !== 'LighthouseAuditor' ||
    baseline.provenance.targetOrigin !== new URL(baseUrl).origin
  ) {
    throw new Error('Unverified or different-origin Lighthouse baseline. Run npm run lighthouse:baseline against this target first.');
  }

  for (const route of routes) {
    const report = baseline.reports?.[route];
    if (
      !report ||
      !Number.isFinite(report.metrics?.firstContentfulPaint) ||
      report.metrics.firstContentfulPaint <= 0 ||
      !Number.isFinite(report.score)
    ) {
      throw new Error(`Lighthouse baseline is missing valid measurements for ${route}.`);
    }
  }
}
