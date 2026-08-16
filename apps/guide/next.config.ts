import path from 'node:path';

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    // static export served by Cloudflare Workers static assets (see wrangler.jsonc + worker.ts)
    output: 'export',
    trailingSlash: true,
    images: { unoptimized: true },
    // pin tracing to the monorepo root so workspace:* deps resolve into the build (matches apps/home).
    outputFileTracingRoot: path.join(import.meta.dirname, '../..'),
    turbopack: {}
};

export default nextConfig;
