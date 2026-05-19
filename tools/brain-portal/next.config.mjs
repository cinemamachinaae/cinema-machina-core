/** @type {import("next").NextConfig} */
const nextConfig = {
  // Keep this portal self-contained and production-safe by default.
  reactStrictMode: true,

  // Use a local distDir to prevent iCloud from corrupting the webpack chunk caches during dev.
  distDir: ".next-local",
};

export default nextConfig;
