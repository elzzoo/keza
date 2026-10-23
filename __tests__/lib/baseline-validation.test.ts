import { assertComparableBaseline } from '@/lib/performance/baseline-validation';

const routes = ['/', '/prix'];

function measuredBaseline(origin = 'https://example.com') {
  return {
    timestamp: '2026-10-23T00:00:00.000Z',
    provenance: {
      source: 'measured',
      targetOrigin: origin,
      generator: 'LighthouseAuditor',
    },
    reports: Object.fromEntries(routes.map((route) => [route, {
      url: route,
      score: 90,
      metrics: { firstContentfulPaint: 1000 },
      timestamp: '2026-10-23T00:00:00.000Z',
    }])),
  };
}

describe('assertComparableBaseline', () => {
  it('rejects the tracked example baseline before any new audit', () => {
    const example = require('../../reports/lighthouse/baseline.json');
    expect(() => assertComparableBaseline(example, 'https://example.com', routes))
      .toThrow(/Unverified/);
  });

  it('accepts measured data for the same target origin', () => {
    expect(() => assertComparableBaseline(measuredBaseline(), 'https://example.com/prix', routes))
      .not.toThrow();
  });

  it('rejects a different target origin', () => {
    expect(() => assertComparableBaseline(measuredBaseline(), 'https://other.example', routes))
      .toThrow(/different-origin/);
  });

  it('rejects a missing or invalid route measurement', () => {
    const baseline = measuredBaseline();
    baseline.reports['/prix'].metrics.firstContentfulPaint = 0;
    expect(() => assertComparableBaseline(baseline, 'https://example.com', routes))
      .toThrow(/valid measurements for \/prix/);
  });
});
