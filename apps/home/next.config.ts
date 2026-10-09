import path from 'node:path';

import { HOME } from '@seedcord/ui/sites';
import { staticExport } from '@seedcord/ui/staticExport';

import type { NextConfig } from 'next';

const nextConfig = (phase: string): NextConfig => ({
    // static export served by Cloudflare Workers static assets (see wrangler.jsonc + worker.ts)
    ...staticExport(phase, HOME),
    trailingSlash: true,
    // pin tracing to the monorepo root so workspace:* deps resolve into the build (matches apps/docs).
    outputFileTracingRoot: path.join(import.meta.dirname, '../..'),
    serverExternalPackages: ['@takumi-rs/core'],
    // the default 11 workers peaked at 2.4 GB on a 12-core mac. 2 built as fast in 0.95 GB
    experimental: { cpus: 2 },
    turbopack: {}
});

export default nextConfig;
