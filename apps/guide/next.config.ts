import path from 'node:path';

import { createMDX } from 'fumadocs-mdx/next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';

import type { NextConfig } from 'next';

const PAGE_EXTENSIONS = ['tsx', 'ts', 'jsx', 'js'];

// a build-time notFound() still writes the route's file into a static export
const devOnly = (phase: string): string[] => (phase === PHASE_DEVELOPMENT_SERVER ? ['dev.tsx', 'dev.ts'] : []);

function guideConfig(phase: string): NextConfig {
    return {
        pageExtensions: [...PAGE_EXTENSIONS, ...devOnly(phase)],
        // wrangler.jsonc and worker.ts serve these files as cloudflare static assets
        output: 'export',
        trailingSlash: true,
        images: { unoptimized: true },
        // workspace:* deps resolve into the build only from the monorepo root
        outputFileTracingRoot: path.join(import.meta.dirname, '../..'),
        // a bundler cannot see the require('fs') @typescript/vfs assembles with String.fromCharCode
        // prettier loads its typescript parser by path at call time
        serverExternalPackages: ['typescript', '@typescript/vfs', 'twoslash', '@shikijs/twoslash', 'prettier'],
        turbopack: {}
    };
}

const config = (phase: string): NextConfig => createMDX()(guideConfig(phase));

export default config;
