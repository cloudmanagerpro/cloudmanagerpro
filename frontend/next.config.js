/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for the Phase 3 Docker image (minimal standalone server output).
  output: "standalone",
  reactStrictMode: true,
  // Keep type-checking on (fails the build on real type errors), but don't let
  // stylistic lint rules block production builds.
  eslint: {
    ignoreDuringBuilds: true,
  },
  // The Idle / Cleanup / Rightsizing pages were merged into /dashboard/optimize.
  // Keep the old URLs working (bookmarks, deep links) by redirecting to the tab.
  async redirects() {
    return [
      {
        source: "/dashboard/cleanup",
        destination: "/dashboard/optimize?tab=cleanup",
        permanent: false,
      },
      {
        source: "/dashboard/idle",
        destination: "/dashboard/optimize?tab=idle",
        permanent: false,
      },
      {
        source: "/dashboard/rightsizing",
        destination: "/dashboard/optimize?tab=rightsizing",
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
