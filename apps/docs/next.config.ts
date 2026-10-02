import path from 'node:path';

// next loads this file with require. ./sites has a bare default export for that condition
import { DOCS } from '@seedcord/ui/sites';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';

import type { NextConfig } from 'next';

const PAGE_EXTENSIONS = ['tsx', 'ts', 'jsx', 'js'];

// a build-time notFound() still writes the route's file into a static export
const devOnly = (phase: string): string[] => (phase === PHASE_DEVELOPMENT_SERVER ? ['dev.tsx', 'dev.ts'] : []);

const config = (phase: string): NextConfig => ({
    pageExtensions: [...PAGE_EXTENSIONS, ...devOnly(phase)],
    basePath: DOCS.path,
    output: 'export',
    distDir: 'dist/docs',
    images: { unoptimized: true },
    // workspace:* deps resolve into the build only from the monorepo root
    outputFileTracingRoot: path.join(import.meta.dirname, '../..'),
    serverExternalPackages: [
        '@seedcord/docs-engine',
        '@seedcord/docs-generator',
        // these three read files off disk by path and break when bundled
        '@microsoft/api-extractor-model',
        '@microsoft/tsdoc',
        '@microsoft/tsdoc-config'
    ],
    // same 7s build at 2 workers, with peak memory down from 3.7 GB to 2.2 GB
    experimental: { cpus: 2 },
    turbopack: {}
});

export default config;
