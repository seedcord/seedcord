import path from 'node:path';

// next loads this file with require. ./sites has a bare default export for that condition
import { DOCS } from '@seedcord/ui/sites';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';

import type { NextConfig } from 'next';

const PAGE_EXTENSIONS = ['tsx', 'ts', 'jsx', 'js'];

// a build-time notFound() still writes the route's file into a static export
const devOnly = (phase: string): string[] => (phase === PHASE_DEVELOPMENT_SERVER ? ['dev.tsx', 'dev.ts'] : []);

// same 7s build at 2 workers, with peak memory down from 3.7 GB to 2.2 GB
const LAPTOP_CPUS = 2;

function buildCpus(): number {
    const requested = Number.parseInt(process.env.DOCS_BUILD_CPUS ?? '', 10);
    return Number.isInteger(requested) && requested > 0 ? requested : LAPTOP_CPUS;
}

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
    experimental: { cpus: buildCpus() },
    turbopack: {}
});

export default config;
