import { mkdir, mkdtempDisposable, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { SeedcordErrorCode, isSeedcordError } from '@seedcord/errors';
import { assert, describe, expect, it, onTestFinished } from 'vitest';

import { openModuleLoader } from '#core/modules/openModuleLoader';

async function project(options: Record<string, unknown> = {}): Promise<string> {
    const tmp = await mkdtempDisposable(join(tmpdir(), 'seedcord-loader-'));
    onTestFinished(() => tmp.remove());
    const root = tmp.path;
    const compilerOptions = { module: 'preserve', moduleResolution: 'bundler', ...options };

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

describe('openModuleLoader', () => {
    it('resolves an import through a tsconfig paths alias', async () => {
        const root = await project({ paths: { '#lib/*': ['./src/lib/*'] } });
        const entry = await writeEntry(root, '#lib/greeting');

        await using modules = await openModuleLoader(root);
        const module = await modules.importModule<{ value: string }>(entry);

        expect(module.value).toBe('hi');
    });

    // codegen pulls in whatever a command file imports
    it('follows an extensionless import into a file holding JSX the way its tsconfig compiles it', async () => {
        const root = await project({ jsx: 'react' });
        await writeFile(
            join(root, 'src', 'lib', 'card.tsx'),
            `const React = { createElement: (tag) => tag };\nexport const greeting = <b />;\n`,
            'utf8'
        );
        const entry = await writeEntry(root, './lib/card');

        await using modules = await openModuleLoader(root);
        const module = await modules.importModule<{ value: string }>(entry);

        expect(module.value).toBe('b');
    });

    it('loads a seedcord.config.mts', async () => {
        const root = await project();
        const config = join(root, 'seedcord.config.mts');
        await writeFile(config, `export default { instance: './bot.ts' } satisfies object;\n`, 'utf8');

        await using modules = await openModuleLoader(root);
        const module = await modules.importModule<{ default: unknown }>(config);

        expect(module.default).toEqual({ instance: './bot.ts' });
    });

    it('throws CliEntryNotFound for a file that does not exist', async () => {
        const root = await project();

        await using modules = await openModuleLoader(root);

        await expect(modules.importModule(join(root, 'src', 'missing.ts'))).rejects.toMatchObject({
            code: SeedcordErrorCode.CliEntryNotFound
        });
    });

    it('throws CliImportFailed with the reason when a module throws while it loads', async () => {
        const root = await project();
        const entry = join(root, 'src', 'broken.ts');
        await writeFile(entry, `throw new Error('top level boom');\n`, 'utf8');

        await using modules = await openModuleLoader(root);
        const caught: unknown = await modules.importModule(entry).catch((error: unknown) => error);

        assert(isSeedcordError(caught));
        expect(caught.code).toBe(SeedcordErrorCode.CliImportFailed);
        expect(caught.message).toContain('top level boom');
    });

    it('throws CliPathHasHash for a file whose path contains a #', async () => {
        const root = join(await project(), 'hash#bot');
        await mkdir(root);
        const entry = join(root, 'entry.ts');
        await writeFile(entry, `export const value = 'hi';\n`, 'utf8');

        await using modules = await openModuleLoader(root);

        await expect(modules.importModule(entry)).rejects.toMatchObject({ code: SeedcordErrorCode.CliPathHasHash });
    });

    it('resolves a relative import with no paths declared', async () => {
        const root = await project();
        const entry = await writeEntry(root, './lib/greeting');

        await using modules = await openModuleLoader(root);
        const module = await modules.importModule<{ value: string }>(entry);

        expect(module.value).toBe('hi');
    });
});
