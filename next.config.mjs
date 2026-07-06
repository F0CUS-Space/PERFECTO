// Security headers applied to every response. These are provider-agnostic and safe
// for the Firebase Auth / Stripe / reCAPTCHA integrations (they frame us, not vice versa).
const securityHeaders = [
  // Prevent MIME-type sniffing.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Disallow the site being framed by other origins (clickjacking protection).
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Don't leak full URLs in the Referer header to other origins.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Drop access to powerful browser features the app does not use.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  // Force HTTPS for two years, including subdomains.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produces a minimal standalone server output for small Docker images on EC2.
  output: "standalone",
  reactStrictMode: true,
  // Don't advertise the framework in response headers.
  poweredByHeader: false,
  // Keep Node-only server SDKs out of the webpack bundle (they use `node:` built-ins).
  serverExternalPackages: ["firebase-admin", "stripe"],
  experimental: {
    optimizePackageImports: ["lucide-react", "@tanstack/react-query"],
  },
  images: {
    remotePatterns: [
      // S3 bucket (property photos, resumes-derived public assets, etc.)
      { protocol: "https", hostname: "*.amazonaws.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
