import type { NextConfig } from "next";

// Baseline security headers (pre-launch audit, תקנות אבטחת מידע). No full
// Content-Security-Policy yet: the inline theme script (app/layout.tsx),
// Supabase, Google sign-in and the Anthropic-backed actions would each need
// allow-listing — frame-ancestors alone covers clickjacking. Nothing here
// uses the camera, microphone or location; WebAuthn (passkeys) and push are
// deliberately left unrestricted.
const securityHeaders = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
