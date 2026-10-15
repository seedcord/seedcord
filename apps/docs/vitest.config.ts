import { createVitestConfig } from '@seedcord/vitest-config';

export default createVitestConfig(import.meta.url, {
    // oxc's default JSX runtime is classic
    oxc: { jsx: { runtime: 'automatic' } },
    test: {
        // these tests vi.mock docs' own modules, and a mock carries into the next file in a shared worker
        isolate: true,
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./tests/test-setup.ts']
    }
});
