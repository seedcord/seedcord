import { mkdirSync, mkdtempDisposableSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { beforeEach, describe, expect, it } from 'vitest';

import { resolveProjectTsc } from '#core/modules/resolveProjectTsc';

let projectDir: string;

beforeEach(() => {
    const tmp = mkdtempDisposableSync(join(tmpdir(), 'seedcord-tsc-'));
    // require.resolve returns the real path of a mac temp dir
    projectDir = realpathSync(tmp.path);
    writeFileSync(join(projectDir, 'package.json'), JSON.stringify({ name: 'bot' }));
    return () => tmp.remove();
});

function installTypescript(manifest: Record<string, unknown>): string {
    const packageDir = join(projectDir, 'node_modules/typescript');
    mkdirSync(join(packageDir, 'bin'), { recursive: true });
    writeFileSync(join(packageDir, 'package.json'), JSON.stringify({ name: 'typescript', ...manifest }));
    writeFileSync(join(packageDir, 'bin/tsc'), '#!/usr/bin/env node\n');
    return join(packageDir, 'bin/tsc');
}

describe('resolveProjectTsc', () => {
    it('finds tsc in a typescript 7 install', () => {
        const tsc = installTypescript({ exports: { '.': './lib/version.cjs', './package.json': './package.json' } });

        expect(resolveProjectTsc(projectDir)).toBe(tsc);
    });

    it('finds tsc in a typescript 6 install', () => {
        const tsc = installTypescript({});

        expect(resolveProjectTsc(projectDir)).toBe(tsc);
    });
});
