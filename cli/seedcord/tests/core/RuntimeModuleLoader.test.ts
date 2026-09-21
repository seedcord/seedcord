import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { RuntimeModuleLoader } from '#core/modules/RuntimeModuleLoader';

async function project(paths?: Record<string, string[]>): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), 'seedcord-loader-'));
    const compilerOptions = { module: 'preserve', moduleResolution: 'bundler', ...(paths && { paths }) };

    await writeFile(join(root, 'tsconfig.json'), JSON.stringify({ compilerOptions }), 'utf8');
    await mkdir(join(root, 'src', 'lib'), { recursive: true });
    await writeFile(join(root, 'src', 'lib', 'greeting.ts'), `export const greeting = 'hi';\n`, 'utf8');

    return root;
}

async function writeEntry(root: string, specifier: string): Promise<string> {
    const entry = join(root, 'src', 'entry.ts');
    await writeFile(entry, `import { greeting } from '${specifier}';\nexport const value = greeting;\n`, 'utf8');

    return entry;
}

describe('RuntimeModuleLoader', () => {
    it('resolves an import through a tsconfig paths alias', async () => {
        const root = await project({ '#lib/*': ['./src/lib/*'] });
        const entry = await writeEntry(root, '#lib/greeting');

        const module = await new RuntimeModuleLoader().importModule<{ value: string }>(entry);

        expect(module.value).toBe('hi');
    });

    // codegen pulls in whatever a command file imports
    it('follows an extensionless import into a file holding JSX', async () => {
        const root = await project();
        await writeFile(
            join(root, 'src', 'lib', 'card.tsx'),
            `const React = { createElement: (tag) => tag };\nexport const greeting = <b />;\n`,
            'utf8'
        );
        const entry = await writeEntry(root, './lib/card');

        const module = await new RuntimeModuleLoader().importModule<{ value: string }>(entry);

        expect(module.value).toBe('b');
    });

    it('resolves a relative import with no paths declared', async () => {
        const root = await project();
        const entry = await writeEntry(root, './lib/greeting');

        const module = await new RuntimeModuleLoader().importModule<{ value: string }>(entry);

        expect(module.value).toBe('hi');
    });
});
