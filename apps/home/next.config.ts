import path from 'node:path';

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    // static export served by Cloudflare Workers static assets (see wrangler.jsonc + worker.ts)
    output: 'export',
    trailingSlash: true,
    images: { unoptimized: true },
    // pin tracing to the monorepo root so workspace:* deps resolve into the build (matches apps/docs).
    outputFileTracingRoot: path.join(import.meta.dirname, '../..'),
    // one worker per core was taking up 2.4 GB on a 12-core mac whereas 2 built just as fast in 0.95 GB
    experimental: { cpus: 2 },
    turbopack: {}
};

export default nextConfig;
