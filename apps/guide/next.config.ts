import path from 'node:path';

import { createMDX } from 'fumadocs-mdx/next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';

import type { NextConfig } from 'next';

const PAGE_EXTENSIONS = ['tsx', 'ts', 'jsx', 'js'];

// a build-time notFound() still writes the route's file into a static export
const devOnly = (phase: string): string[] => (phase === PHASE_DEVELOPMENT_SERVER ? ['dev.tsx'] : []);

function guideConfig(phase: string): NextConfig {
    return {
        pageExtensions: [...PAGE_EXTENSIONS, ...devOnly(phase)],
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
}

const config = (phase: string): NextConfig => createMDX()(guideConfig(phase));

export default config;
