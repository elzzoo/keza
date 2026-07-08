/**
 * P0.4 Task 10: Lighthouse Performance Measurement Tests
 *
 * Measures FCP (First Contentful Paint) metric on:
 * - Homepage (/)
 * - Pricing page (/prix)
 * - Map page (/carte)
 * - Programs page (/programmes)
 *
 * TDD: These tests define the expected behavior for performance measurement.
 * They will fail until Lighthouse measurement implementation is complete.
 */

import { LighthouseAuditor } from '../../lib/performance/lighthouse-auditor';
import type { LighthouseReport, BaselineReport } from '../../lib/performance/lighthouse-auditor';
import * as fs from 'fs';
import * as path from 'path';

describe('P0.4 Task 10: Lighthouse Performance Measurement', () => {
  let auditor: LighthouseAuditor;
  let baselineReport: BaselineReport | null = null;
  const reportsDir = path.join(process.cwd(), 'reports', 'lighthouse');

  beforeAll(() => {
    // Initialize auditor
    auditor = new LighthouseAuditor({
      baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3000',
      outputDir: reportsDir,
    });

    // Ensure reports directory exists
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Try to load baseline if it exists
    const baselineFile = path.join(reportsDir, 'baseline.json');
    if (fs.existsSync(baselineFile)) {
      baselineReport = JSON.parse(fs.readFileSync(baselineFile, 'utf-8'));
    }
  });

  afterAll(() => {
    // Cleanup can be added if needed
  });

  describe('Homepage (/) - FCP Measurement', () => {
    it('should run Lighthouse audit on homepage', async () => {
      const report = await auditor.audit('/');

      expect(report).toBeDefined();
      expect(report.url).toBe('/');
      expect(report.metrics).toBeDefined();
    }, 180000); // 3 minute timeout for Lighthouse

    it('should capture FCP metric', async () => {
      const report = await auditor.audit('/');

      expect(report.metrics).toHaveProperty('firstContentfulPaint');
      expect(report.metrics.firstContentfulPaint).toBeGreaterThan(0);
      expect(report.metrics.firstContentfulPaint).toBeLessThan(5000); // Should be < 5 seconds
    }, 180000);

    it('should have overall score >= 50', async () => {
      const report = await auditor.audit('/');

      expect(report.score).toBeGreaterThanOrEqual(50);
    }, 180000);
  });

  describe('Pricing Page (/prix) - FCP Measurement', () => {
    it('should run Lighthouse audit on /prix', async () => {
      const report = await auditor.audit('/prix');

      expect(report).toBeDefined();
      expect(report.url).toBe('/prix');
      expect(report.metrics).toBeDefined();
    }, 180000);

    it('should capture FCP metric for /prix', async () => {
      const report = await auditor.audit('/prix');

      expect(report.metrics).toHaveProperty('firstContentfulPaint');
      expect(report.metrics.firstContentfulPaint).toBeGreaterThan(0);
      expect(report.metrics.firstContentfulPaint).toBeLessThan(5000);
    }, 180000);
  });

  describe('Map Page (/carte) - FCP Measurement', () => {
    it('should run Lighthouse audit on /carte', async () => {
      const report = await auditor.audit('/carte');

      expect(report).toBeDefined();
      expect(report.url).toBe('/carte');
      expect(report.metrics).toBeDefined();
    }, 180000);

    it('should capture FCP metric for /carte', async () => {
      const report = await auditor.audit('/carte');

      expect(report.metrics).toHaveProperty('firstContentfulPaint');
      expect(report.metrics.firstContentfulPaint).toBeGreaterThan(0);
      expect(report.metrics.firstContentfulPaint).toBeLessThan(5000);
    }, 180000);
  });

  describe('Programs Page (/programmes) - FCP Measurement', () => {
    it('should run Lighthouse audit on /programmes', async () => {
      const report = await auditor.audit('/programmes');

      expect(report).toBeDefined();
      expect(report.url).toBe('/programmes');
      expect(report.metrics).toBeDefined();
    }, 180000);

    it('should capture FCP metric for /programmes', async () => {
      const report = await auditor.audit('/programmes');

      expect(report.metrics).toHaveProperty('firstContentfulPaint');
      expect(report.metrics.firstContentfulPaint).toBeGreaterThan(0);
      expect(report.metrics.firstContentfulPaint).toBeLessThan(5000);
    }, 180000);
  });

  describe('Performance Comparison & Baseline', () => {
    it('should save baseline report if none exists', async () => {
      if (!baselineReport) {
        const pages = ['/', '/prix', '/carte', '/programmes'];
        const baseline = await auditor.auditAllPages(pages);

        expect(baseline).toBeDefined();
        expect(baseline.reports).toBeDefined();
        expect(fs.existsSync(path.join(reportsDir, 'baseline.json'))).toBe(true);
      }
    }, 720000); // 12 minute timeout for 4 audits

    it('should generate performance comparison report', async () => {
      if (baselineReport) {
        const pages = ['/', '/prix', '/carte', '/programmes'];
        const currentReports: Record<string, LighthouseReport> = {};

        for (const page of pages) {
          currentReports[page] = await auditor.audit(page);
        }

        const comparison = auditor.compareWithBaseline(baselineReport, currentReports);

        expect(comparison).toBeDefined();
        expect(comparison.timestamp).toBeDefined();
        expect(comparison.comparison).toBeDefined();

        // Save comparison report
        await auditor.saveComparison(comparison);
        expect(fs.existsSync(path.join(reportsDir, 'comparison.json'))).toBe(true);
      }
    }, 720000);

    it('should document FCP improvements', async () => {
      if (baselineReport) {
        const pages = ['/', '/prix', '/carte', '/programmes'];
        const currentReports: Record<string, LighthouseReport> = {};

        for (const page of pages) {
          currentReports[page] = await auditor.audit(page);
        }

        const comparison = auditor.compareWithBaseline(baselineReport, currentReports);
        const report = auditor.generateMarkdownReport(comparison);

        expect(report).toBeDefined();
        expect(report).toContain('FCP');
        expect(report.length).toBeGreaterThan(0);

        // Save markdown report
        const reportPath = path.join(reportsDir, 'performance-report.md');
        fs.writeFileSync(reportPath, report);
        expect(fs.existsSync(reportPath)).toBe(true);
      }
    }, 720000);
  });
});
