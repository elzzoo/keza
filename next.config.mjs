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
];

const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    serverActions: { allowedOrigins: ["localhost:3000"] },
    serverExternalPackages: ["web-push"],
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

export default nextConfig;
