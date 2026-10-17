import { extname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseTsconfig } from 'get-tsconfig';
import { configDefaults, defineConfig, mergeConfig } from 'vite-plus';
import { deepMerge } from 'vite-plus/test/plugins/utils-helpers';

import type { ViteUserConfig, AliasOptions } from 'vite-plus';
import type { InlineConfig } from 'vite-plus/test/node';

const base = defineConfig({
    test: {
        // isolating every file cost about 40% of the suite's CPU
        isolate: false,
        // on a dev machine with turbo.json's 2 tasks at once, 25% each leaves about half the cores free
        ...(!process.env.CI && { maxWorkers: '25%' }),
        // mergeConfig puts these before a package's own setupFiles
        setupFiles: [fileURLToPath(new URL(`freshModules${extname(import.meta.url)}`, import.meta.url))],
        // node_modules packages that keep state between test files
        server: { deps: { inline: ['envapt', '@testing-library/react'] } },
        testTimeout: 10_000,
        passWithNoTests: true,
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
export function aliasFromTsconfig(configUrl: string): AliasOptions {
    // parseTsconfig because tsconfig can be jsonc
    const paths = parseTsconfig(fileURLToPath(new URL('tsconfig.json', configUrl))).compilerOptions?.paths ?? {};
    // vite takes the first alias that matches. tsc takes an exact key first, then the longest wildcard prefix
    const byMatchOrder = Object.entries(paths).toSorted(
        ([a], [b]) => wildcardPrefixLength(b) - wildcardPrefixLength(a)
    );
    return byMatchOrder.flatMap(([key, targets]) =>
        targets.slice(0, 1).map((target) => {
            const replacement = fileURLToPath(new URL(target.replace('*', ''), configUrl));
            if (key.includes('*')) return { find: key.replace('*', ''), replacement };
            // vite also matches a string find as a prefix. '#flat' would catch '#flat/sub'
            return { find: new RegExp(`^${RegExp.escape(key)}$`), replacement };
        })
    );
}

function wildcardPrefixLength(key: string): number {
    return key.includes('*') ? key.indexOf('*') : Number.MAX_SAFE_INTEGER;
}

const VITEST_CONFIG: InlineConfig = {
    testTimeout: 10_000,
    passWithNoTests: true,
    exclude: [...configDefaults.exclude, '**/.claude/**'],
    coverage: {
        enabled: false,
        provider: 'v8',
        reporter: [['lcovonly', { file: 'lcov.info' }], ['html']],
        include: ['src'],
        exclude: ['**/node_modules/**', '**/dist/**', '**/*.test.ts', '**/*.spec.ts', '**/logs/**', '**/*.log']
    }
};

export function createTestConfig(overrides: InlineConfig = {}): InlineConfig {
    return deepMerge(VITEST_CONFIG, overrides);
}

export function createVitestConfig(configUrl: string, overrides: ViteUserConfig = {}): ViteUserConfig {
    return mergeConfig(
        mergeConfig(base, defineConfig({ resolve: { alias: aliasFromTsconfig(configUrl) } })),
        overrides
    );
}
