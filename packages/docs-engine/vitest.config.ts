import path from 'path';

import { defineConfig, mergeConfig } from 'vitest/config';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: import from root
import rootConfig from '../../vitest.config';

export default mergeConfig(
    rootConfig,
    defineConfig({
        resolve: {
            alias: {
                '@src': path.resolve(__dirname, './src'),
                '@model': path.resolve(__dirname, './src/model'),
                '@builders': path.resolve(__dirname, './src/builders'),
                '@routing': path.resolve(__dirname, './src/routing'),
                '@services': path.resolve(__dirname, './src/services'),
                '@transformers': path.resolve(__dirname, './src/transformers'),
                '@lookup': path.resolve(__dirname, './src/lookup'),
                '@packages': path.resolve(__dirname, './src/packages'),
                '@remote': path.resolve(__dirname, './src/remote')
            }
        },
        test: {
            globals: true,
            environment: 'node',
            testTimeout: 15000,
            globalSetup: './tests/utils/globalSetup.ts'
        }
    })
);
