import path from 'node:path';

// next loads this file under the require condition. ./sites and ./static-export export a bare default which also matches it
import { GUIDE } from '@seedcord/ui/sites';
import { staticExport } from '@seedcord/ui/staticExport';
import { createMDX } from 'fumadocs-mdx/next';

import type { NextConfig } from 'next';

function guideConfig(phase: string): NextConfig {
    return {
        // wrangler.jsonc and worker.ts serve the export as cloudflare static assets
        ...staticExport(phase, GUIDE),
        trailingSlash: true,
        // workspace:* deps resolve into the build only from the monorepo root
        outputFileTracingRoot: path.join(import.meta.dirname, '../..'),
        // a bundler cannot see the require('fs') @typescript/vfs assembles with String.fromCharCode
        // prettier loads its typescript parser by path at call time
        serverExternalPackages: ['typescript', '@typescript/vfs', 'twoslash', '@shikijs/twoslash', 'prettier'],
        // 2 workers slowed this build from 19s to 29s. 4 adds about 3s
        experimental: { cpus: 4 },
        turbopack: {}
    };
}

const config = (phase: string): NextConfig => createMDX()(guideConfig(phase));

export default config;
