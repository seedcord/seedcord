import { extname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseTsconfig } from 'get-tsconfig';
import { configDefaults, defineConfig, mergeConfig } from 'vitest/config';

import type { ViteUserConfig } from 'vitest/config';

const base = defineConfig({
    test: {
        // isolating every file cost about 40% of the suite's CPU
        isolate: false,
        // with turbo.json's 2 tasks at once, 25% each leaves about half the cores free
        maxWorkers: '25%',
        // mergeConfig puts these before a package's own setupFiles
        setupFiles: [fileURLToPath(new URL(`freshModules${extname(import.meta.url)}`, import.meta.url))],
        // envapt caches process.env on first read
        server: { deps: { inline: ['envapt'] } },
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

type Alias = Extract<NonNullable<NonNullable<ViteUserConfig['resolve']>['alias']>, readonly unknown[]>[number];

// configUrl is expected to be the caller's import.meta.url
export function aliasFromTsconfig(configUrl: string): Alias[] {
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

export function createVitestConfig(configUrl: string, overrides: ViteUserConfig = {}): ViteUserConfig {
    return mergeConfig(
        mergeConfig(base, defineConfig({ resolve: { alias: aliasFromTsconfig(configUrl) } })),
        overrides
    );
}
