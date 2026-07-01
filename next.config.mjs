/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produces a minimal standalone server output for small Docker images on EC2.
  output: "standalone",
  reactStrictMode: true,
  // Keep Node-only server SDKs out of the webpack bundle (they use `node:` built-ins).
  serverExternalPackages: ["firebase-admin"],
  images: {
    remotePatterns: [
      // S3 bucket (property photos, resumes-derived public assets, etc.)
      { protocol: "https", hostname: "*.amazonaws.com" },
    ],
  },
};

export default nextConfig;
