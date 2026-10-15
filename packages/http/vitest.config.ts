import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { aliasFromTsconfig, createVitestConfig } from '@seedcord/vitest-config';

// only the node project extends the top-level config
const alias = aliasFromTsconfig(import.meta.url);

export default createVitestConfig(import.meta.url, {
    test: {
        coverage: {
            // the workers pool rejects the v8 provider the shared config sets
            provider: 'istanbul'
        },
        projects: [
            {
                // real workerd, with cloudflare's node compat on like a deployed edge bot
                plugins: [
                    cloudflareTest({
                        // cloudflare turns node compat on by default from this date
                        miniflare: { compatibilityDate: '2026-08-04' }
                    })
                ],
                resolve: { alias },
                test: {
                    name: 'workerd',
                    testTimeout: 10_000,
                    setupFiles: ['./tests/setup.ts'],
                    include: ['tests/**/*.test.ts'],
                    exclude: ['tests/node/**'],
                    deps: {
                        optimizer: {
                            ssr: {
                                enabled: true,
                                // the pool's cjs interop resolves discord-api-types' runtime enums to
                                // undefined, pre-bundling picks the esm arm. builders hits the same
                                // interop at module init, and its pre-bundle inlines shapeshift already.
                                include: ['discord-api-types/v10', '@discordjs/builders']
                            }
                        }
                    }
                }
            },
            {
                // no node:http on workerd
                extends: true,
                test: {
                    name: 'node',
                    environment: 'node',
                    setupFiles: ['./tests/setup.ts'],
                    include: ['tests/node/**/*.test.ts']
                }
            }
        ]
    }
});
