#!/usr/bin/env ts-node

/**
 * Lighthouse Performance Audit CLI
 *
 * Usage:
 *   npm run lighthouse:baseline    - Create baseline report
 *   npm run lighthouse:compare     - Compare current metrics with baseline
 *   npm run lighthouse:audit /prix - Audit specific route
 */

import { LighthouseAuditor } from '../lib/performance/lighthouse-auditor';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const command = process.argv[2] || 'baseline';
  const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
  const outputDir = path.join(process.cwd(), 'reports', 'lighthouse');

  const auditor = new LighthouseAuditor({
    baseUrl,
    outputDir,
  });

  try {
    if (command === 'baseline') {
      await runBaseline(auditor, outputDir);
    } else if (command === 'compare') {
      await runComparison(auditor, outputDir);
    } else if (command === 'audit') {
      const route = process.argv[3] || '/';
      await runSingleAudit(auditor, route);
    } else if (command === 'clean') {
      await cleanReports(outputDir);
    } else {
      console.log('Unknown command:', command);
      console.log('Available commands: baseline, compare, audit, clean');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await auditor.closeChrome();
  }
}

async function runBaseline(auditor: LighthouseAuditor, outputDir: string) {
  console.log('Running Lighthouse audit on all pages...');

  const pages = ['/', '/prix', '/carte', '/programmes'];
  const baseline = await auditor.auditAllPages(pages);

  console.log('\nBaseline Report Saved!');
  console.log(`Location: ${path.join(outputDir, 'baseline.json')}\n`);

  // Print summary
  console.log('Page Metrics Summary:');
  for (const [url, report] of Object.entries(baseline.reports)) {
    console.log(`\n${url}:`);
    console.log(`  FCP: ${report.metrics.firstContentfulPaint.toFixed(0)} ms`);
    console.log(`  Performance Score: ${report.performanceScore}/100`);
  }
}

async function runComparison(auditor: LighthouseAuditor, outputDir: string) {
  const baselineFile = path.join(outputDir, 'baseline.json');

  if (!fs.existsSync(baselineFile)) {
    console.error('No baseline found. Run "npm run lighthouse:baseline" first.');
    process.exit(1);
  }

  console.log('Loading baseline...');
  const baseline = JSON.parse(fs.readFileSync(baselineFile, 'utf-8'));

  console.log('Running current audits...');
  const pages = ['/', '/prix', '/carte', '/programmes'];
  const currentReports: Record<string, any> = {};

  for (const page of pages) {
    currentReports[page] = await auditor.audit(page);
  }

  const comparison = auditor.compareWithBaseline(baseline, currentReports);
  await auditor.saveComparison(comparison);

  // Generate markdown report
  const markdownReport = auditor.generateMarkdownReport(comparison);
  const reportPath = path.join(outputDir, 'performance-report.md');
  fs.writeFileSync(reportPath, markdownReport);

  console.log('\nComparison Report Generated!');
  console.log(`JSON: ${path.join(outputDir, 'comparison.json')}`);
  console.log(`Markdown: ${reportPath}\n`);

  // Print summary
  console.log(markdownReport);
}

async function runSingleAudit(auditor: LighthouseAuditor, route: string) {
  console.log(`Running Lighthouse audit on ${route}...`);

  const report = await auditor.audit(route);

  console.log('\nAudit Complete!');
  console.log(`URL: ${report.url}`);
  console.log(`FCP: ${report.metrics.firstContentfulPaint.toFixed(0)} ms`);
  console.log(`Performance Score: ${report.performanceScore}/100`);
  console.log(`Accessibility Score: ${report.accessibilityScore}/100`);
  console.log(`Best Practices Score: ${report.bestPracticesScore}/100`);
  console.log(`SEO Score: ${report.seoScore}/100`);
}

async function cleanReports(outputDir: string) {
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true });
    console.log('Lighthouse reports cleaned.');
  }
}

main();
