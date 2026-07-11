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
                '@bot': path.resolve(__dirname, './src/bot'),
                '@subscribers': path.resolve(__dirname, './src/subscribers'),
                '@interfaces': path.resolve(__dirname, './src/interfaces'),
                '@handlers': path.resolve(__dirname, './src/handlers'),
                '@inputs': path.resolve(__dirname, './src/inputs'),
                '@pagination': path.resolve(__dirname, './src/pagination'),
                '@miscellaneous': path.resolve(__dirname, './src/miscellaneous'),

                // Paths inside bot
                '@bUtilities': path.resolve(__dirname, './src/bot/utilities'),
                '@bControllers': path.resolve(__dirname, './src/bot/controllers'),
                '@bDecorators': path.resolve(__dirname, './src/bot/decorators')
            }
        },
        test: {
            globals: true,
            environment: 'node',
            testTimeout: 10_000,
            setupFiles: ['./tests/setup.ts']
        }
    })
);
