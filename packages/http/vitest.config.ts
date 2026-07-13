import path from 'node:path';

import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { defineConfig, mergeConfig } from 'vitest/config';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore ts is crying because the import isn't from http's src dir
import rootConfig from '../../vitest.config';

const alias = { '@src': path.resolve(__dirname, './src') };

export default mergeConfig(
    rootConfig,
    defineConfig({
        test: {
            coverage: {
                // the workers pool rejects the v8 provider the root config sets
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
                        exclude: ['tests/node/**']
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
    })
);
