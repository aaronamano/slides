import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    KIBANA_URL: process.env.KIBANA_URL,
    ELASTICSEARCH_API_KEY: process.env.ELASTICSEARCH_API_KEY,
  },
};

export default nextConfig;
