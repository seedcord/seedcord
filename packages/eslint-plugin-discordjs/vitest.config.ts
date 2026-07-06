import { defineConfig, mergeConfig } from 'vitest/config';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore ts is crying because the import isn't from generators's src dir
import rootConfig from '../../vitest.config';

export default mergeConfig(
    rootConfig,
    defineConfig({
        test: {
            // each type-aware test builds a TS program, and prePush runs every suite in parallel
            testTimeout: 60_000
        }
    })
);
