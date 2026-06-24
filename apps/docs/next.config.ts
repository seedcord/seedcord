import path from 'node:path';

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    output: 'standalone',
    // Pin the file-tracing root to the monorepo root so tracing can resolve the workspace:* deps under
    // packages/* into the standalone bundle; without it the emitted server.js path is nondeterministic.
    outputFileTracingRoot: path.join(import.meta.dirname, '../..'),
    // tsdoc-config reads tsdoc.schema.json at runtime via a constructed path, which nft's JS-require
    // trace misses, so the standalone server 500s loading the extractor model. Force the schema in.
    outputFileTracingIncludes: {
        '**': ['../../node_modules/.pnpm/@microsoft+tsdoc@*/node_modules/@microsoft/tsdoc/schemas/**/*']
    },
    serverExternalPackages: [
        '@seedcord/docs-engine',
        '@seedcord/docs-generator',
        // API Extractor model + TSDoc do runtime file reads (tsdoc.schema.json); keep them out of the
        // server bundle so Node resolves them from node_modules at runtime.
        '@microsoft/api-extractor-model',
        '@microsoft/tsdoc',
        '@microsoft/tsdoc-config'
    ],
    headers() {
        return [
            {
                // RFC 8288 discovery hint pointing agents at the machine-readable index, skips assets + meta routes
                source: '/((?!_next/|og/|llms.txt|sitemap.xml|robots.txt).*)',
                headers: [{ key: 'Link', value: '</llms.txt>; rel="alternate"; type="text/plain"' }]
            }
        ];
    },
    turbopack: {}
};

// eslint-disable-next-line import/no-default-export -- Next.js config entrypoint
export default nextConfig;
