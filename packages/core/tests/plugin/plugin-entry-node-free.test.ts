import { existsSync, readFileSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const distDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../dist');

const nodeBuiltins = new Set(builtinModules);

const importRe =
    /(?:import|export)[^'"]*from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|(?<![\w.$])import\s*['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)/g;

function specsIn(source: string): string[] {
    return [...source.matchAll(importRe)].reduce<string[]>((acc, match) => {
        const spec = match[1] ?? match[2] ?? match[3] ?? match[4];
        if (spec) acc.push(spec);
        return acc;
    }, []);
}

function nodeImportsInClosure(entryFile: string): string[] {
    const seen = new Set<string>();
    const hits: string[] = [];

    const walk = (file: string): void => {
        if (seen.has(file)) return;
        seen.add(file);

        for (const spec of specsIn(readFileSync(file, 'utf8'))) {
            if (spec.startsWith('node:') || nodeBuiltins.has(spec)) hits.push(`${file}: ${spec}`);
            if (spec.startsWith('./') || spec.startsWith('../')) walk(join(dirname(file), spec));
        }
    };

    walk(entryFile);
    return hits;
}

// Buffer is a global, so the import walk above never sees it, and it is undefined on workerd
function bufferUsesInClosure(entryFile: string): string[] {
    const seen = new Set<string>();
    const hits: string[] = [];

    const walk = (file: string): void => {
        if (seen.has(file)) return;
        seen.add(file);

        const source = readFileSync(file, 'utf8');
        if (/(?<![\w.$])Buffer\s*\./u.test(source)) hits.push(file);
        for (const spec of specsIn(source)) {
            if (spec.startsWith('./') || spec.startsWith('../')) walk(join(dirname(file), spec));
        }
    };

    walk(entryFile);
    return hits;
}

describe.each([
    ['/plugin', 'plugin.index.mjs'],
    ['root', 'index.mjs']
])('%s dist is node-free', (_entryName, entry) => {
    it(`has no node builtin import in ${entry}`, () => {
        const file = join(distDir, entry);
        expect(existsSync(file), `${entry} is missing, run pnpm -C packages/core build first`).toBe(true);
        expect(nodeImportsInClosure(file)).toStrictEqual([]);
    });

    it(`reaches no Buffer global in ${entry}`, () => {
        expect(bufferUsesInClosure(join(distDir, entry))).toStrictEqual([]);
    });
});
