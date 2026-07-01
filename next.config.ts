import type { NextConfig } from "next";

import { productionSecurityHeaders } from "@/lib/security/headers";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "static.wikia.nocookie.net",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: Object.entries(productionSecurityHeaders()).map(([key, value]) => ({ key, value })),
      },
      {
        source: "/api/(.*)",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};

export default nextConfig;
