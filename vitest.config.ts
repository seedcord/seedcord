import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        testTimeout: 500,
        coverage: {
            enabled: true,
            provider: 'v8',
            reporter: [['lcovonly', { file: 'lcov.info' }], ['html'], ['text']],
            include: ['src'],
            exclude: ['**/node_modules/**', '**/dist/**', '**/*.test.ts', '**/*.spec.ts', '**/logs/**', '**/*.log']
        }
    }
});
