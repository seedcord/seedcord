import { defineConfig, mergeConfig } from 'vitest/config';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: import from root
import rootConfig from '../../vitest.config';

export default mergeConfig(
    rootConfig,
    defineConfig({
        test: {
            globals: true,
            environment: 'node',
            testTimeout: 15000,
            globalSetup: './tests/utils/globalSetup.ts'
        }
    })
);
