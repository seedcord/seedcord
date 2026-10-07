import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { resolveProjectTsc } from '#core/modules/resolveProjectTsc';

let projectDir: string;

beforeEach(() => {
    // require.resolve returns the real path of a mac temp dir
    projectDir = realpathSync(mkdtempSync(join(tmpdir(), 'seedcord-tsc-')));
    writeFileSync(join(projectDir, 'package.json'), JSON.stringify({ name: 'bot' }));
});

afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
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
