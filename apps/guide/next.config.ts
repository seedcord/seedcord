import path from 'node:path';

import { createMDX } from 'fumadocs-mdx/next';

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    // twoslash runs the real typescript compiler
    serverExternalPackages: ['typescript', 'twoslash'],
    // static export served by Cloudflare Workers static assets (see wrangler.jsonc + worker.ts)
    output: 'export',
    trailingSlash: true,
    images: { unoptimized: true },
    // pin tracing to the monorepo root so workspace:* deps resolve into the build (matches apps/home).
    outputFileTracingRoot: path.join(import.meta.dirname, '../..'),
    turbopack: {}
};

export default createMDX()(nextConfig);
