import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { ESLint } from 'eslint';
import { afterEach, describe, expect, it } from 'vitest';

import createConfig from '@src/index';

import type { Linter } from 'eslint';

const roots: string[] = [];

afterEach(() => {
    while (roots.length > 0) rmSync(roots.pop() ?? '', { recursive: true, force: true });
});

// a project whose prettier config disagrees with the seedcord defaults on both counts
function projectAsking(prettierOptions: string, source: string): string {
    const root = mkdtempSync(join(tmpdir(), 'seedcord-prettier-'));
    roots.push(root);

    mkdirSync(join(root, 'src'));
    writeFileSync(join(root, 'prettier.config.mjs'), `export default ${prettierOptions};\n`);
    writeFileSync(join(root, 'tsconfig.json'), '{ "include": ["src"] }\n');
    writeFileSync(join(root, 'src', 'x.ts'), source);

    return root;
}

async function prettierMessages(root: string): Promise<Linter.LintMessage[]> {
    const eslint = new ESLint({
        cwd: root,
        overrideConfigFile: true,
        overrideConfig: createConfig({ tsconfigRootDir: root, registerTypescriptConfigs: false })
    });

    const [result] = await eslint.lintFiles([join(root, 'src', 'x.ts')]);
    return (result?.messages ?? []).filter((message) => message.ruleId === 'prettier/prettier');
}

describe('prettier rule', () => {
    it('accepts what the project prettier config asks for', async () => {
        const root = projectAsking('{ semi: false, singleQuote: false }', 'const a = "hi"\n');

        expect(await prettierMessages(root)).toEqual([]);
    });

    it('still reports a file that breaks the project prettier config', async () => {
        const root = projectAsking('{ semi: false, singleQuote: false }', 'const a =   "hi"  ;;\n');

        expect(await prettierMessages(root)).not.toEqual([]);
    });
});
