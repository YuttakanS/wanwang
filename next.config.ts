import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Stream no metadata for any client: Next's bot list is not known to cover LINE's preview crawler.
  htmlLimitedBots: /.*/,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Event pages show people's names and availability, so keep them out of search results.
      // Their address is all that protects them, so it is never sent as a referrer either, not even
      // to this site: the page-view counter's own request would otherwise carry it. This entry
      // comes after the general one, and the later of two values for the same header wins.
      {
        source: "/e/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Referrer-Policy", value: "strict-origin" },
        ],
      },
      // Android refuses to verify App Links unless this file is served as JSON.
      { source: "/.well-known/assetlinks.json", headers: [{ key: "Content-Type", value: "application/json" }] },
    ];
  },
};

export default nextConfig;
