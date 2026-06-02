import { fileURLToPath } from 'node:url';

import { defineConfig, mergeConfig } from 'vitest/config';

// @ts-ignore: import from root
import rootConfig from '../../vitest.config';

const resolveAppPath = (segment: string): string => fileURLToPath(new URL(segment, import.meta.url));

export default mergeConfig(
    rootConfig,
    defineConfig({
        // The test transform needs the React automatic runtime; oxc defaults to classic otherwise.
        oxc: { jsx: { runtime: 'automatic' } },
        resolve: {
            alias: {
                '@components': resolveAppPath('./src/components'),
                '@ui': resolveAppPath('./src/components/ui'),
                '@lib': resolveAppPath('./src/lib'),
                '@store': resolveAppPath('./src/store'),
                '@': resolveAppPath('./src')
            }
        },
        test: {
            globals: true,
            environment: 'jsdom',
            setupFiles: ['./tests/test-setup.ts'],
            testTimeout: 5000
        }
    })
);
