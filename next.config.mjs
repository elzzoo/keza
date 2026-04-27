// @ts-check
import { withSentryConfig } from "@sentry/nextjs";

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
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js App Router requires both
      "style-src 'self' 'unsafe-inline'", // Tailwind CSS requires unsafe-inline
      "img-src 'self' data: blob: https:", // allow HTTPS images (airline logos etc.)
      "connect-src 'self' https:", // Sentry, Vercel analytics, API calls
      "font-src 'self' data:",
      "frame-ancestors 'none'", // belt+suspenders with X-Frame-Options
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    serverActions: { allowedOrigins: ["localhost:3000"] },
    serverComponentsExternalPackages: ["web-push"],
    // Tree-shake large packages — only import what's used
    optimizePackageImports: ["lucide-react", "@heroicons/react", "date-fns"],
  },
  // Compress responses
  compress: true,
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

export default withSentryConfig(nextConfig, {
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
});
