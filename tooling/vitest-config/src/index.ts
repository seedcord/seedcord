import { fileURLToPath } from 'node:url';

import { parseTsconfig } from 'get-tsconfig';
import { configDefaults, defineConfig, mergeConfig } from 'vitest/config';

import type { ViteUserConfig } from 'vitest/config';

const base = defineConfig({
    test: {
        testTimeout: 10_000,
        exclude: [...configDefaults.exclude, '**/.claude/**'],
        coverage: {
            enabled: false,
            provider: 'v8',
            reporter: [['lcovonly', { file: 'lcov.info' }], ['html']],
            include: ['src'],
            exclude: ['**/node_modules/**', '**/dist/**', '**/*.test.ts', '**/*.spec.ts', '**/logs/**', '**/*.log']
        }
    }
});

// configUrl is expected to be the caller's import.meta.url
export function aliasFromTsconfig(configUrl: string): Record<string, string> {
    // parseTsconfig because tsconfig can be jsonc
    const paths = parseTsconfig(fileURLToPath(new URL('tsconfig.json', configUrl))).compilerOptions?.paths ?? {};
    return Object.fromEntries(
        Object.entries(paths).flatMap(([key, targets]) =>
            targets
                .slice(0, 1)
                .map((target) => [key.replace('*', ''), fileURLToPath(new URL(target.replace('*', ''), configUrl))])
        )
    );
}

export function createVitestConfig(configUrl: string, overrides: ViteUserConfig = {}): ViteUserConfig {
    return mergeConfig(
        mergeConfig(base, defineConfig({ resolve: { alias: aliasFromTsconfig(configUrl) } })),
        overrides
    );
}
