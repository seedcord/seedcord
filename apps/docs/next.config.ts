import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    serverExternalPackages: [
        '@seedcord/docs-engine',
        '@seedcord/docs-generator',
        // API Extractor model + TSDoc do runtime file reads (tsdoc.schema.json); keep them out of the
        // server bundle so Node resolves them from node_modules at runtime.
        '@microsoft/api-extractor-model',
        '@microsoft/tsdoc',
        '@microsoft/tsdoc-config'
    ],
    turbopack: {}
};

export default nextConfig;
