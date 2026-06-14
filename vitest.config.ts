import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        testTimeout: 5000,
        coverage: {
            enabled: true,
            provider: 'v8',
            reporter: [['lcovonly', { file: 'lcov.info' }], ['html']],
            include: ['src'],
            exclude: ['**/node_modules/**', '**/dist/**', '**/*.test.ts', '**/*.spec.ts', '**/logs/**', '**/*.log']
        }
    }
});
