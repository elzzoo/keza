/**
 * Lighthouse Auditor
 *
 * Runs Lighthouse audits on specified URLs and captures performance metrics.
 * Supports baseline creation, comparison, and markdown report generation.
 */

import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import * as fs from 'fs';
import * as path from 'path';

export interface MetricsData {
  firstContentfulPaint: number;
  largestContentfulPaint?: number;
  cumulativeLayoutShift?: number;
  timeToInteractive?: number;
  speedIndex?: number;
}

export interface LighthouseReport {
  url: string;
  score: number;
  metrics: MetricsData;
  timestamp: string;
  performanceScore?: number;
  accessibilityScore?: number;
  bestPracticesScore?: number;
  seoScore?: number;
}

export interface BaselineReport {
  timestamp: string;
  description?: string;
  reports: Record<string, LighthouseReport>;
}

export interface ComparisonResult {
  timestamp: string;
  baseline: BaselineReport;
  current: Record<string, LighthouseReport>;
  comparison: Record<string, {
    url: string;
    fcp: {
      baseline: number;
      current: number;
      improvement: number;
      percentChange: number;
    };
    score: {
      baseline: number;
      current: number;
      change: number;
    };
  }>;
}

export interface LighthouseAuditorOptions {
  baseUrl: string;
  outputDir: string;
  chromePort?: number;
}

export class LighthouseAuditor {
  private baseUrl: string;
  private outputDir: string;
  private chromePort: number = 9222;
  private chrome: any | null = null;

  constructor(options: LighthouseAuditorOptions) {
    this.baseUrl = options.baseUrl;
    this.outputDir = options.outputDir;
    if (options.chromePort) {
      this.chromePort = options.chromePort;
    }
  }

  /**
   * Launch Chrome browser for Lighthouse auditing
   */
  async launchChrome(): Promise<void> {
    if (this.chrome) return;

    try {
      this.chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
      this.chromePort = this.chrome.port;
    } catch (error) {
      console.error('Failed to launch Chrome:', error);
      throw error;
    }
  }

  /**
   * Close Chrome browser
   */
  async closeChrome(): Promise<void> {
    if (this.chrome) {
      try {
        await (this.chrome as any).kill();
      } catch (error) {
        console.error('Error killing Chrome:', error);
      }
      this.chrome = null;
    }
  }

  /**
   * Run Lighthouse audit on a specific URL
   */
  async audit(routePath: string): Promise<LighthouseReport> {
    const url = `${this.baseUrl}${routePath}`;

    try {
      // Launch Chrome if not already running
      if (!this.chrome) {
        await this.launchChrome();
      }

      const options = {
        logLevel: 'error' as const,
        port: this.chromePort,
        output: 'json' as const,
      };

      const runnerResult = await lighthouse(url, options);

      if (!runnerResult) {
        throw new Error(`No result from Lighthouse for ${url}`);
      }

      const lhr = runnerResult.lhr;

      // Extract metrics from Lighthouse report
      const metrics = this.extractMetrics(lhr);
      const scores = this.extractScores(lhr);

      const performanceScore = lhr.categories.performance?.score ?? 0;

      const report: LighthouseReport = {
        url: routePath,
        score: performanceScore * 100,
        metrics,
        timestamp: new Date().toISOString(),
        performanceScore: scores.performance,
        accessibilityScore: scores.accessibility,
        bestPracticesScore: scores.bestPractices,
        seoScore: scores.seo,
      };

      return report;
    } catch (error) {
      console.error(`Error auditing ${url}:`, error);
      throw error;
    }
  }

  /**
   * Extract performance metrics from Lighthouse report
   */
  private extractMetrics(lhr: any): MetricsData {
    const metrics: MetricsData = {
      firstContentfulPaint: 0,
    };

    // Extract FCP from Lighthouse audits
    const fcpAudit = lhr.audits['first-contentful-paint'];
    if (fcpAudit?.numericValue) {
      metrics.firstContentfulPaint = fcpAudit.numericValue;
    }

    // Extract LCP
    const lcpAudit = lhr.audits['largest-contentful-paint'];
    if (lcpAudit?.numericValue) {
      metrics.largestContentfulPaint = lcpAudit.numericValue;
    }

    // Extract CLS
    const clsAudit = lhr.audits['cumulative-layout-shift'];
    if (clsAudit?.numericValue) {
      metrics.cumulativeLayoutShift = clsAudit.numericValue;
    }

    // Extract TTI
    const ttiAudit = lhr.audits['interactive'];
    if (ttiAudit?.numericValue) {
      metrics.timeToInteractive = ttiAudit.numericValue;
    }

    // Extract Speed Index
    const siAudit = lhr.audits['speed-index'];
    if (siAudit?.numericValue) {
      metrics.speedIndex = siAudit.numericValue;
    }

    return metrics;
  }

  /**
   * Extract category scores from Lighthouse report
   */
  private extractScores(lhr: any): {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  } {
    return {
      performance: Math.round(lhr.categories.performance.score * 100),
      accessibility: Math.round(lhr.categories.accessibility.score * 100),
      bestPractices: Math.round(lhr.categories['best-practices'].score * 100),
      seo: Math.round(lhr.categories.seo.score * 100),
    };
  }

  /**
   * Save baseline report to file
   */
  async saveBaseline(baseline: BaselineReport): Promise<void> {
    const filePath = path.join(this.outputDir, 'baseline.json');

    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    fs.writeFileSync(filePath, JSON.stringify(baseline, null, 2));
  }

  /**
   * Save comparison report to file
   */
  async saveComparison(comparison: ComparisonResult): Promise<void> {
    const filePath = path.join(this.outputDir, 'comparison.json');

    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    fs.writeFileSync(filePath, JSON.stringify(comparison, null, 2));
  }

  /**
   * Compare current metrics with baseline
   */
  compareWithBaseline(
    baseline: BaselineReport,
    current: Record<string, LighthouseReport>
  ): ComparisonResult {
    const comparison: Record<string, any> = {};

    for (const [url, currentReport] of Object.entries(current)) {
      const baselineReport = baseline.reports[url];

      if (!baselineReport) {
        console.warn(`No baseline found for ${url}`);
        continue;
      }

      const fcpImprovement = baselineReport.metrics.firstContentfulPaint -
                            currentReport.metrics.firstContentfulPaint;
      const fcpPercentChange = (fcpImprovement / baselineReport.metrics.firstContentfulPaint) * 100;

      const scoreChange = currentReport.score - baselineReport.score;

      comparison[url] = {
        url,
        fcp: {
          baseline: baselineReport.metrics.firstContentfulPaint,
          current: currentReport.metrics.firstContentfulPaint,
          improvement: fcpImprovement,
          percentChange: fcpPercentChange,
        },
        score: {
          baseline: baselineReport.score,
          current: currentReport.score,
          change: scoreChange,
        },
      };
    }

    return {
      timestamp: new Date().toISOString(),
      baseline,
      current,
      comparison,
    };
  }

  /**
   * Generate markdown report from comparison results
   */
  generateMarkdownReport(comparison: ComparisonResult): string {
    let report = `# Lighthouse Performance Report\n\n`;
    report += `**Generated:** ${comparison.timestamp}\n\n`;

    report += `## Performance Comparison\n\n`;
    report += `| Route | Baseline FCP (ms) | Current FCP (ms) | Improvement (ms) | Improvement (%) | Score Change |\n`;
    report += `|-------|------------------|------------------|------------------|-----------------|---------------|\n`;

    for (const [url, data] of Object.entries(comparison.comparison)) {
      const fcp = data.fcp;
      const score = data.score;
      const improvementPercent = fcp.percentChange.toFixed(1);
      const scoreChangeStr = score.change >= 0 ? `+${score.change.toFixed(1)}` : `${score.change.toFixed(1)}`;

      report += `| ${url} | ${fcp.baseline.toFixed(0)} | ${fcp.current.toFixed(0)} | ${fcp.improvement.toFixed(0)} | ${improvementPercent}% | ${scoreChangeStr} |\n`;
    }

    // Calculate aggregate improvements
    let totalFcpImprovement = 0;
    let totalFcpBaseline = 0;
    let pageCount = 0;

    for (const data of Object.values(comparison.comparison)) {
      totalFcpBaseline += data.fcp.baseline;
      totalFcpImprovement += data.fcp.improvement;
      pageCount++;
    }

    const avgFcpImprovement = totalFcpImprovement / pageCount;
    const avgFcpBaseline = totalFcpBaseline / pageCount;
    const avgPercentChange = (avgFcpImprovement / avgFcpBaseline) * 100;

    report += `\n## Summary\n\n`;
    report += `- **Pages Audited:** ${pageCount}\n`;
    report += `- **Average FCP Baseline:** ${avgFcpBaseline.toFixed(0)} ms\n`;
    report += `- **Average FCP Improvement:** ${avgFcpImprovement.toFixed(0)} ms\n`;
    report += `- **Average Improvement:** ${avgPercentChange.toFixed(1)}%\n`;

    report += `\n## Details by Route\n\n`;

    for (const [url, data] of Object.entries(comparison.comparison)) {
      report += `### ${url}\n\n`;
      report += `- **Baseline FCP:** ${data.fcp.baseline.toFixed(0)} ms\n`;
      report += `- **Current FCP:** ${data.fcp.current.toFixed(0)} ms\n`;
      report += `- **Improvement:** ${data.fcp.improvement.toFixed(0)} ms (${data.fcp.percentChange.toFixed(1)}%)\n`;
      report += `- **Baseline Score:** ${data.score.baseline.toFixed(0)}\n`;
      report += `- **Current Score:** ${data.score.current.toFixed(0)}\n`;
      report += `- **Score Change:** ${data.score.change >= 0 ? '+' : ''}${data.score.change.toFixed(1)}\n\n`;
    }

    return report;
  }

  /**
   * Run audit on all pages and save baseline
   */
  async auditAllPages(pages: string[]): Promise<BaselineReport> {
    const reports: Record<string, LighthouseReport> = {};

    for (const page of pages) {
      console.log(`Auditing ${page}...`);
      reports[page] = await this.audit(page);
    }

    const baseline: BaselineReport = {
      timestamp: new Date().toISOString(),
      description: 'Baseline performance metrics',
      reports,
    };

    await this.saveBaseline(baseline);
    return baseline;
  }
}
