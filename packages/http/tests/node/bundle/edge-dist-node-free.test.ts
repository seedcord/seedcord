import { existsSync, readFileSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const distDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../dist');

const nodeBuiltins = new Set(builtinModules);

function nodeImportsInClosure(entryFile: string): string[] {
    const importRe =
        /(?:import|export)[^'"]*from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|(?<![\w.$])import\s*['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)/g;
    const seen = new Set<string>();
    const hits: string[] = [];

    const walk = (file: string): void => {
        if (seen.has(file)) return;
        seen.add(file);

        const source = readFileSync(file, 'utf8');
        for (const match of source.matchAll(importRe)) {
            const spec = match[1] ?? match[2] ?? match[3] ?? match[4];
            if (!spec) continue;
            if (spec.startsWith('node:') || nodeBuiltins.has(spec)) hits.push(`${file}: ${spec}`);
            if (spec.startsWith('./') || spec.startsWith('../')) walk(join(dirname(file), spec));
        }
    };

    walk(entryFile);
    return hits;
}

describe('the shipped ./edge dist is node-free', () => {
    it.each(['edge.index.mjs', 'edge.index.cjs'])('has no node builtin import in %s', (entry) => {
        const file = join(distDir, entry);
        expect(existsSync(file), `${entry} is missing, run pnpm -C packages/http build first`).toBe(true);
        expect(nodeImportsInClosure(file)).toStrictEqual([]);
    });
});
