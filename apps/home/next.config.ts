import path from 'node:path';

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    // deploys to Cloudflare Workers via OpenNext, so no static export or standalone output.
    // pin tracing to the monorepo root so workspace:* deps resolve into the build (matches apps/docs).
    outputFileTracingRoot: path.join(import.meta.dirname, '../..'),
    turbopack: {}
};

export default nextConfig;
