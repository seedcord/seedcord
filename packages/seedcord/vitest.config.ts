import { createVitestConfig } from '@seedcord/vitest-config';

export default createVitestConfig(import.meta.url, {
    test: {
        globals: true,
        environment: 'node'
    }
});
