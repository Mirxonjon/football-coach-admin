import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for the slim Docker image: Next emits a self-contained
  // .next/standalone bundle so the runner stage can run without a full
  // node_modules copy.
  output: "standalone",
};

export default nextConfig;
