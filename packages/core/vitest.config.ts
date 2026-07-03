import path from 'node:path';

import { defineConfig, mergeConfig } from 'vitest/config';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore ts is crying because the import isn't from cli's src dir
import rootConfig from '../../vitest.config';

export default mergeConfig(
    rootConfig,
    defineConfig({
        resolve: {
            alias: {
                '@src': path.resolve(__dirname, './src'),
                '@components': path.resolve(__dirname, './src/components'),
                '@customId': path.resolve(__dirname, './src/customId'),
                '@registries': path.resolve(__dirname, './src/registries'),
                '@stops': path.resolve(__dirname, './src/stops')
            }
        },
        test: {
            globals: true,
            environment: 'node',
            testTimeout: 10_000
        }
    })
);
