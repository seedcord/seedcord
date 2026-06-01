import { defineConfig, mergeConfig } from 'vitest/config';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore ts is crying because the import isn't from generators's src dir
import rootConfig from '../../vitest.config';

export default mergeConfig(
    rootConfig,
    defineConfig({
        test: {
            globals: true,
            environment: 'node',
            testTimeout: 10000,
            globalSetup: './tests/utils/globalSetup.ts',
            fileParallelism: false
        }
    })
);
