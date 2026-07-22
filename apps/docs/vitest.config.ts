import { createVitestConfig } from '@seedcord/vitest-config';

export default createVitestConfig(import.meta.url, {
    // The test transform needs the React automatic runtime; oxc defaults to classic otherwise.
    oxc: { jsx: { runtime: 'automatic' } },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./tests/test-setup.ts']
    }
});
