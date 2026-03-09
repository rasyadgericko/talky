import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: process.cwd(),
  },
  // Keep @xenova/transformers and onnxruntime-node out of the webpack bundle —
  // they run natively in the Node.js server process
  serverExternalPackages: ["@xenova/transformers", "onnxruntime-node", "sharp"],
};

export default nextConfig;
