import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  // Only ever the origin, also for requests to this site. An event's address is all that protects it,
  // and with the usual policy the page-view counter's own request would carry it. This has to hold on
  // every page, not just on /e/: a page reached by a click inside the site keeps the policy of the
  // page that was loaded first.
  { key: "Referrer-Policy", value: "strict-origin" },
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
      { source: "/e/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      // Android refuses to verify App Links unless this file is served as JSON.
      { source: "/.well-known/assetlinks.json", headers: [{ key: "Content-Type", value: "application/json" }] },
    ];
  },
};

export default nextConfig;
