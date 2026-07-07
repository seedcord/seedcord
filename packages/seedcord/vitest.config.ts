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
                '@ui': path.resolve(__dirname, './src/ui'),
                '@core': path.resolve(__dirname, './src/core'),
                '@commands': path.resolve(__dirname, './src/commands'),
                '@utils': path.resolve(__dirname, './src/utils'),
                '@api': path.resolve(__dirname, './src/api')
            }
        },
        test: {
            globals: true,
            environment: 'node',
            testTimeout: 5000
        }
    })
);
