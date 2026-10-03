import path from 'node:path';

// next loads this file with require. ./sites and ./static-export have a bare default export for that condition
import { DOCS } from '@seedcord/ui/sites';
import { staticExport } from '@seedcord/ui/static-export';

import type { NextConfig } from 'next';

// 2 workers peaked at 2.2 GB where the default peaked at 3.7 GB, measured before every version rendered
const LAPTOP_CPUS = 2;

function buildCpus(): number {
    const requested = Number.parseInt(process.env.DOCS_BUILD_CPUS ?? '', 10);
    return Number.isInteger(requested) && requested > 0 ? requested : LAPTOP_CPUS;
}

const config = (phase: string): NextConfig => ({
    ...staticExport(phase, DOCS),
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
