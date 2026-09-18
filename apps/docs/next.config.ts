import path from 'node:path';

// next loads this file under the require condition. ./agents exports a bare default to match
import { agentLinkHeader, canonicalSkillHeader } from '@seedcord/ui/agents';

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
    // afterFiles keeps a real file in public/ ahead of these two
    rewrites() {
        return {
            afterFiles: [
                { source: '/:path*.md', destination: '/llms/:path*' },
                { source: '/:path*.png', destination: '/og/:path*' }
            ]
        };
    },
    headers() {
        return [
            {
                source: '/((?!_next/|og/|llms/|\\.well-known/|llms.txt|sitemap.xml|robots.txt).*(?<!\\.md|\\.png))',
                headers: [{ key: 'Link', value: agentLinkHeader('docs') }]
            },
            {
                source: '/.well-known/:spec(skills|agent-skills)/:name/SKILL.md',
                headers: [{ key: 'Link', value: canonicalSkillHeader() }]
            }
        ];
    },
    turbopack: {}
};

export default nextConfig;
