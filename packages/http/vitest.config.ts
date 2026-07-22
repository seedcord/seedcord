import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { aliasFromTsconfig, createVitestConfig } from '@seedcord/vitest-config';

// the project entries are separate configs and do not inherit the top-level resolve
const alias = aliasFromTsconfig(import.meta.url);

export default createVitestConfig(import.meta.url, {
    test: {
        coverage: {
            // the workers pool rejects the v8 provider the shared config sets
            provider: 'istanbul'
        },
        projects: [
            {
                // real workerd, so a node builtin fails here before it fails on a deploy
                plugins: [
                    cloudflareTest({
                        miniflare: { compatibilityDate: '2026-07-01' }
                    })
                ],
                resolve: { alias },
                test: {
                    name: 'workerd',
                    testTimeout: 10_000,
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
                // no node:http on workerd, so the bridge tests run in a node environment
                resolve: { alias },
                test: {
                    name: 'node',
                    environment: 'node',
                    testTimeout: 10_000,
                    include: ['tests/node/**/*.test.ts']
                }
            }
        ]
    }
});
