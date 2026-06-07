// @ts-check
import { withSentryConfig } from "@sentry/nextjs";
import bundleAnalyzer from "@next/bundle-analyzer";
const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

/** @type {import('next').NextConfig} */

const SECURITY_HEADERS = [
  // Prevent browsers from guessing content type (MIME sniffing)
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Block page from being embedded in iframes (clickjacking)
  { key: "X-Frame-Options", value: "DENY" },
  // Only send origin in Referer header (no path leakage)
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Disable unused browser features
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  // Cross-Origin policies for SharedArrayBuffer safety
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Content-Security-Policy is set dynamically per-request in middleware.ts
  // (nonce-based CSP — see middleware.ts).
];

// City-name slug → IATA redirects.
// These URLs appear in the sitemap for long-tail SEO but the [route] page
// expects 3-char IATA codes. 301 redirects preserve link equity.
const CITY_SLUG_REDIRECTS = [
  { source: "/flights/paris-dakar",         destination: "/flights/CDG-DSS", permanent: true },
  { source: "/flights/dakar-paris",         destination: "/flights/DSS-CDG", permanent: true },
  { source: "/flights/london-lagos",        destination: "/flights/LHR-LOS", permanent: true },
  { source: "/flights/paris-abidjan",       destination: "/flights/CDG-ABJ", permanent: true },
  { source: "/flights/paris-casablanca",    destination: "/flights/CDG-CMN", permanent: true },
  { source: "/flights/london-nairobi",      destination: "/flights/LHR-NBO", permanent: true },
  { source: "/flights/london-johannesburg", destination: "/flights/LHR-JNB", permanent: true },
  { source: "/flights/paris-new-york",      destination: "/flights/CDG-JFK", permanent: true },
  { source: "/flights/new-york-london",     destination: "/flights/JFK-LHR", permanent: true },
  { source: "/flights/dubai-london",        destination: "/flights/DXB-LHR", permanent: true },
  { source: "/flights/istanbul-london",     destination: "/flights/IST-LHR", permanent: true },
  { source: "/flights/paris-tokyo",         destination: "/flights/CDG-NRT", permanent: true },
  { source: "/flights/london-dubai",        destination: "/flights/LHR-DXB", permanent: true },
  { source: "/flights/london-singapore",    destination: "/flights/LHR-SIN", permanent: true },
  { source: "/flights/new-york-paris",      destination: "/flights/JFK-CDG", permanent: true },
];

const nextConfig = {
  // Moved from experimental.serverComponentsExternalPackages in Next.js 15
  serverExternalPackages: ["web-push"],

  // Tree-shaking & code splitting
  webpack: (config, { isServer }) => {
    return config;
  },

  // Optimize image handling
  images: {
    formats: ["image/avif", "image/webp"],
  },

  // Dynamic imports for heavy libraries — tree-shake large packages
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@heroicons/react",
      "date-fns",
      "recharts",
    ],
  },

  // Compress responses
  compress: true,

  // Disable sourcemaps in production to reduce bundle size
  productionBrowserSourceMaps: false,

  async redirects() {
    return CITY_SLUG_REDIRECTS;
  },
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/(.*)",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default withBundleAnalyzer(withSentryConfig(nextConfig, {
  // Sentry organization and project are read from SENTRY_ORG and SENTRY_PROJECT env vars.
  // Source maps are uploaded automatically on build.
  silent: true, // suppress "Creating release" logs

  // Disable the Sentry webpack plugin (source-map upload) unless both DSN *and*
  // SENTRY_AUTH_TOKEN are present. Without the auth token the upload would fail
  // the build; error tracking still works fine without source maps.
  disableServerWebpackPlugin:
    !process.env.SENTRY_DSN || !process.env.SENTRY_AUTH_TOKEN,
  disableClientWebpackPlugin:
    !process.env.NEXT_PUBLIC_SENTRY_DSN || !process.env.SENTRY_AUTH_TOKEN,

  // Tree-shake Sentry logger statements to keep bundle small
  hideSourceMaps: true,
  widenClientFileUpload: false,
}));
