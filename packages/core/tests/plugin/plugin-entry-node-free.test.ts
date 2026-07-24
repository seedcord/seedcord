import { existsSync, readFileSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const distDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../dist');

const nodeBuiltins = new Set(builtinModules);

// ADR-018 requires /plugin node-free so a browser/edge author can import the base.
function nodeImportsInClosure(entryFile: string): string[] {
    const importRe = /(?:import|export)[^'"]*from\s*['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)/g;
    const seen = new Set<string>();
    const hits: string[] = [];

    const walk = (file: string): void => {
        if (seen.has(file)) return;
        seen.add(file);

        const source = readFileSync(file, 'utf8');
        for (const match of source.matchAll(importRe)) {
            const spec = match[1] ?? match[2];
            if (!spec) continue;
            if (spec.startsWith('node:') || nodeBuiltins.has(spec)) hits.push(`${file}: ${spec}`);
            if (spec.startsWith('./') || spec.startsWith('../')) walk(join(dirname(file), spec));
        }
    };

    walk(entryFile);
    return hits;
}

describe('/plugin dist is node-free', () => {
    // skipped until pnpm -C packages/core build emits the dist
    it.skipIf(!existsSync(join(distDir, 'plugin.index.mjs'))).each(['plugin.index.mjs', 'plugin.index.cjs'])(
        'has no node builtin import in %s',
        (entry) => {
            expect(nodeImportsInClosure(join(distDir, entry))).toStrictEqual([]);
        }
    );
});
