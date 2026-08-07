import path from 'node:path';

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    output: 'standalone',
    // tracing resolves the workspace:* deps only from the monorepo root, and without it the emitted
    // server.js path moves between builds
    outputFileTracingRoot: path.join(import.meta.dirname, '../..'),
    // tsdoc-config builds the path to tsdoc.schema.json at runtime, which nft's require trace misses,
    // so the standalone server 500s loading the extractor model
    outputFileTracingIncludes: {
        '**': ['../../node_modules/.pnpm/@microsoft+tsdoc@*/node_modules/@microsoft/tsdoc/schemas/**/*']
    },
    serverExternalPackages: [
        '@seedcord/docs-engine',
        '@seedcord/docs-generator',
        // these three read files off disk at runtime, which only works unbundled
        '@microsoft/api-extractor-model',
        '@microsoft/tsdoc',
        '@microsoft/tsdoc-config'
    ],
    headers() {
        return [
            {
                // rfc 8288 alternate link
                source: '/((?!_next/|og/|llms/|llms.txt|sitemap.xml|robots.txt).*)',
                headers: [{ key: 'Link', value: '</llms.txt>; rel="alternate"; type="text/plain"' }]
            }
        ];
    },
    turbopack: {}
};

// eslint-disable-next-line import/no-default-export -- Next.js config entrypoint
export default nextConfig;
