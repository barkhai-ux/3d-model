import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Agent SDK is a server-only native dependency; keep it external so Next
  // does not try to bundle it for the server runtime.
  serverExternalPackages: ["@anthropic-ai/claude-agent-sdk"],
  // Pin the workspace root to this project (a stray lockfile lives in $HOME).
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
