import path from 'node:path';

import { defineConfig, mergeConfig } from 'vitest/config';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore the root vitest config sits outside this package's tsconfig rootDir
import rootConfig from '../../vitest.config';

export default mergeConfig(
    rootConfig,
    defineConfig({
        resolve: {
            alias: {
                '@src': path.resolve(__dirname, './src'),
                '@components': path.resolve(__dirname, './src/components'),
                '@customId': path.resolve(__dirname, './src/customId'),
                '@decorators': path.resolve(__dirname, './src/decorators'),
                '@gates': path.resolve(__dirname, './src/gates'),
                '@hmr': path.resolve(__dirname, './src/hmr'),
                '@interfaces': path.resolve(__dirname, './src/interfaces'),
                '@notices': path.resolve(__dirname, './src/notices'),
                '@pagination': path.resolve(__dirname, './src/pagination'),
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
