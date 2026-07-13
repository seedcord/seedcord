import { defineConfig, mergeConfig } from 'vitest/config';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore the root config is JS with no .d.ts emitted
import rootConfig from '../../vitest.config';

export default mergeConfig(
    rootConfig,
    defineConfig({
        test: {
            globals: true,
            environment: 'jsdom',
            setupFiles: ['./tests/test-setup.ts'],
            testTimeout: 5000
        }
    })
);
