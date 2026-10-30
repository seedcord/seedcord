import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { ESLint } from 'eslint';
import { expect, it } from 'vite-plus/test';

import createConfig from '#src/index';

const IMPORTER = "import hello from './greet.js';\n\nexport const message = hello('seedcord');\n";

const FILES = {
    'tsconfig.json': JSON.stringify({ compilerOptions: { module: 'nodenext', allowJs: true, strict: true } }),
    'greet.ts': 'export default function greet(name: string): string {\n    return name;\n}\n',
    'main.ts': IMPORTER,
    'legacy.js': IMPORTER
};

async function writeProject(): Promise<AsyncDisposable & { dir: string }> {
    const dir = await mkdtemp(path.join(tmpdir(), 'eslint-config-'));
    await Promise.all(Object.entries(FILES).map(([name, text]) => writeFile(path.join(dir, name), text)));
    return { dir, [Symbol.asyncDispose]: () => rm(dir, { recursive: true, force: true }) };
}

it('parses a .ts file imported from a .ts file and from a .js file', async () => {
    await using project = await writeProject();
    const eslint = new ESLint({
        cwd: project.dir,
        overrideConfigFile: true,
        overrideConfig: createConfig({ tsconfigRootDir: project.dir })
    });

    const results = await eslint.lintFiles(['main.ts', 'legacy.js']);
    const renames = results.map(
        (result) => result.messages.find((message) => message.ruleId === 'import-x/no-rename-default')?.message
    );

    expect(renames).toEqual([
        expect.stringContaining('has a default export `greet`'),
        expect.stringContaining('has a default export `greet`')
    ]);
});
