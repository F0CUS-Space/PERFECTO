// Content-Security-Policy tuned for this app's third parties:
// - Firebase Auth (phone/reCAPTCHA) + Firestore realtime (HTTPS + WebSocket)
// - Stripe.js + Checkout
// - S3 images
// Scripts allow 'unsafe-inline'/'unsafe-eval' because Next.js hydration and the
// Firebase/Stripe/reCAPTCHA SDKs require it without a nonce pipeline. The remaining
// directives (frame-ancestors, object-src, base-uri, form-action, restricted
// connect/frame hosts) still provide meaningful protection.
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.google.com https://www.gstatic.com https://js.stripe.com https://*.firebaseapp.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://*.googleapis.com https://*.google.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://*.firebaseapp.com https://api.stripe.com",
  "frame-src 'self' https://*.firebaseapp.com https://www.google.com https://recaptcha.google.com https://js.stripe.com https://hooks.stripe.com",
  "worker-src 'self' blob:",
  "upgrade-insecure-requests",
].join("; ");

// Security headers applied to every response. These are provider-agnostic and safe
// for the Firebase Auth / Stripe / reCAPTCHA integrations (they frame us, not vice versa).
const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
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
    // SECURITY (AWS outbound DoS alert 2026-07-15):
    // Next.js `/_next/image` fetches remote URLs server-side and streams them to clients.
    // With a broad remotePatterns allowlist this becomes an unauthenticated egress amplifier.
    // Disable the optimizer so the Node process never downloads third-party/S3 objects for images.
    // Local brand assets still work; remote/S3 URLs are rendered with browser-direct loads.
    unoptimized: true,
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
