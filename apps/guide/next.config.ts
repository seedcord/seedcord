import path from 'node:path';

import { createMDX } from 'fumadocs-mdx/next';

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    // static export served by Cloudflare Workers static assets (see wrangler.jsonc + worker.ts)
    output: 'export',
    trailingSlash: true,
    images: { unoptimized: true },
    // pin tracing to the monorepo root so workspace:* deps resolve into the build (matches apps/home).
    outputFileTracingRoot: path.join(import.meta.dirname, '../..'),
    // a bundler cannot see the require('fs') @typescript/vfs assembles with String.fromCharCode
    serverExternalPackages: ['typescript', '@typescript/vfs', 'twoslash', '@shikijs/twoslash'],
    turbopack: {}
};

export default createMDX()(nextConfig);
