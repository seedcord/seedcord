import { mkdtempDisposableSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it, vi } from 'vitest';

import { BUILT_FILES_KEY, builtConfigDir, readTextFiles, traverseDirectory } from '#src/node/directory';
import { toPosixPath } from '#src/node/paths';
import { clearBuiltFiles } from '#tests/builtFilesSlot';

interface BuiltFileLoaders {
    root: string;
    folders: string[];
    modules: Record<string, () => Promise<Record<string, unknown>>>;
    text: Record<string, () => Promise<string>>;
    sourcePaths?: boolean;
    configFile?: string;
}

// not on disk. path.resolve adds the drive letter on windows
const ROOT = path.resolve('/bot');

function at(relative: string): string {
    return path.join(ROOT, relative);
}

// writes the slot the way seedcord build's generated entry does
function register({
    root = ROOT,
    folders = [],
    modules = {},
    text = {},
    ...rest
}: Partial<BuiltFileLoaders>): Disposable {
    Reflect.set(globalThis, Symbol.for(BUILT_FILES_KEY), { root, folders, modules, text, ...rest });
    return { [Symbol.dispose]: clearBuiltFiles };
}

function stub(name: string): () => Promise<Record<string, unknown>> {
    return () => Promise.resolve({ name });
}

async function walk(dir: string): Promise<[string, unknown][]> {
    const seen: [string, unknown][] = [];
    for await (const { fullPath, imported } of traverseDirectory(dir)) seen.push([fullPath, imported.name]);
    return seen;
}

async function rejection(iterable: AsyncIterable<unknown>): Promise<unknown> {
    try {
        for await (const _ of iterable);
        return null;
    } catch (caught) {
        return caught;
    }
}

describe('builtConfigDir', () => {
    it('returns the folder holding seedcord.config.ts', () => {
        using project = mkdtempDisposableSync(path.join(tmpdir(), 'seedcord-built-'));
        writeFileSync(path.join(project.path, 'seedcord.config.ts'), '');
        using _built = register({ root: path.join(project.path, 'dist'), configFile: '../seedcord.config.ts' });

        expect(builtConfigDir()).toBe(project.path);
    });

    it('returns nothing for a build copied away from its project', () => {
        using elsewhere = mkdtempDisposableSync(path.join(tmpdir(), 'seedcord-built-'));
        using _built = register({ root: path.join(elsewhere.path, 'app'), configFile: '../seedcord.config.ts' });

        expect(builtConfigDir()).toBeUndefined();
    });
});

describe('traverseDirectory in a built bot', () => {
    it('reports a file outside the working directory by its full path', async () => {
        using _built = register({ folders: ['/handlers'], modules: { '/handlers/Roll.ts': stub('Roll') } });
        const shown: string[] = [];
        for await (const { relativePath } of traverseDirectory(at('handlers'))) shown.push(relativePath);

        expect(shown).toEqual([toPosixPath(at('handlers/Roll.js'))]);
    });

    it('visits the registered modules under the folder as built js files', async () => {
        using _built = register({
            folders: ['/handlers', '/handlers/mod', '/commands'],
            modules: {
                '/handlers/mod/Ban.ts': stub('Ban'),
                '/commands/Ping.ts': stub('Ping'),
                '/handlers/Roll.ts': stub('Roll')
            }
        });

        await expect(walk(at('handlers'))).resolves.toEqual([
            [at('handlers/Roll.js'), 'Roll'],
            [at('handlers/mod/Ban.js'), 'Ban']
        ]);
    });

    it('keeps the ts path of a module when the table holds source files', async () => {
        using _built = register({
            folders: ['/handlers'],
            modules: { '/handlers/Roll.ts': stub('Roll') },
            sourcePaths: true
        });

        await expect(walk(at('handlers'))).resolves.toEqual([[at('handlers/Roll.ts'), 'Roll']]);
    });

    it('skips registered type declarations, the same as the disk walk', async () => {
        using _built = register({
            folders: ['/handlers'],
            modules: { '/handlers/types.d.ts': stub('types'), '/handlers/A.ts': stub('A') }
        });

        await expect(walk(at('handlers'))).resolves.toEqual([[at('handlers/A.js'), 'A']]);
    });

    it('loads nothing past the file the caller stopped at', async () => {
        const later = vi.fn(stub('Later'));
        using _built = register({
            folders: ['/handlers'],
            modules: { '/handlers/A.ts': stub('A'), '/handlers/B.ts': later }
        });

        for await (const { imported } of traverseDirectory(at('handlers'))) {
            if (imported.name === 'A') break;
        }

        expect(later).not.toHaveBeenCalled();
    });

    it('resolves a relative folder against root', async () => {
        using _built = register({ folders: ['/handlers'], modules: { '/handlers/Roll.ts': stub('Roll') } });

        await expect(walk('./handlers')).resolves.toEqual([[at('handlers/Roll.js'), 'Roll']]);
    });

    it('treats a folder whose name starts with two dots as inside root', async () => {
        using _built = register({ folders: ['/..cache'], modules: { '/..cache/Warm.ts': stub('Warm') } });

        await expect(walk(at('..cache'))).resolves.toEqual([[at('..cache/Warm.js'), 'Warm']]);
    });

    it('visits every module when the folder is root itself', async () => {
        using _built = register({ modules: { '/index.ts': stub('index') } });

        await expect(walk(ROOT)).resolves.toEqual([[at('index.js'), 'index']]);
    });

    it('visits every module when root is the filesystem root', async () => {
        const fsRoot = path.resolve('/');
        using _built = register({
            root: fsRoot,
            folders: ['/handlers'],
            modules: { '/handlers/Roll.ts': stub('Roll') }
        });

        await expect(walk(fsRoot)).resolves.toEqual([[path.join(fsRoot, 'handlers/Roll.js'), 'Roll']]);
    });

    it('yields nothing for an empty folder the build registered', async () => {
        using _built = register({
            folders: ['/handlers', '/subscribers'],
            modules: { '/handlers/Roll.ts': stub('Roll') }
        });

        await expect(walk(at('subscribers'))).resolves.toEqual([]);
    });

    it('reports a folder the build never registered as missing from the build', async () => {
        using _built = register({ folders: ['/handlers'], modules: { '/handlers/Roll.ts': stub('Roll') } });

        const error = await rejection(traverseDirectory(at('handlerz')));

        expect(error).toMatchObject({ code: SeedcordErrorCode.CoreDirectoryNotBuilt });
        expect(Error.isError(error) ? error.message : '').toMatch(/handlerz/);
    });

    it('reports the file whose module failed to load, keeping the original as the cause', async () => {
        const broken = (): Promise<Record<string, unknown>> => Promise.reject(new Error('boom'));
        using _built = register({ folders: ['/handlers'], modules: { '/handlers/Broken.ts': broken } });

        const error = await rejection(traverseDirectory(at('handlers')));

        expect(error).toMatchObject({ code: SeedcordErrorCode.CoreImportFailed });
        expect(Error.isError(error) ? error.message : '').toMatch(/Broken\.js/);
        expect(Error.isError(error) ? error.cause : undefined).toMatchObject({ message: 'boom' });
    });

    it('throws with the folder and the root when the folder sits outside root', async () => {
        using _built = register({ folders: ['/handlers'], modules: { '/handlers/Roll.ts': stub('Roll') } });

        const error = await rejection(traverseDirectory('/elsewhere/handlers'));

        expect(error).toMatchObject({ code: SeedcordErrorCode.CorePathOutsideRoot });
        expect(Error.isError(error) ? error.message : '').toMatch(/\/elsewhere\/handlers[\s\S]*\/bot/);
    });
});

describe('readTextFiles in a built bot', () => {
    it('reads the registered text under the folder with its own extension', async () => {
        using _built = register({
            folders: ['/locales', '/tags'],
            text: {
                '/locales/fr.json': () => Promise.resolve('{"hi":"salut"}'),
                '/tags/faq.md': () => Promise.resolve('# faq'),
                '/locales/en.json': () => Promise.resolve('{"hi":"hello"}')
            }
        });

        const seen: [string, string][] = [];
        for await (const { fullPath, text } of readTextFiles(at('locales'))) seen.push([fullPath, text]);

        expect(seen).toEqual([
            [at('locales/en.json'), '{"hi":"hello"}'],
            [at('locales/fr.json'), '{"hi":"salut"}']
        ]);
    });

    it('skips the same files the disk walk skips', async () => {
        const text = (): Promise<string> => Promise.resolve('{}');
        using _built = register({
            folders: ['/locales', '/locales/.cache'],
            text: {
                '/locales/Skipped.ts': text,
                '/locales/.hidden': text,
                '/locales/en.json.map': text,
                '/locales/.cache/cached.json': text,
                '/locales/en.json': text
            }
        });

        const seen: string[] = [];
        for await (const { fullPath } of readTextFiles(at('locales'))) seen.push(fullPath);

        expect(seen).toEqual([at('locales/en.json')]);
    });

    it('reports the file whose text failed to load by its path, keeping the original as the cause', async () => {
        const broken = (): Promise<string> => Promise.reject(new Error('boom'));
        using _built = register({ folders: ['/locales'], text: { '/locales/en.json': broken } });

        const error = await rejection(readTextFiles(at('locales')));

        expect(error).toMatchObject({ code: SeedcordErrorCode.CorePathUnreadable });
        expect(Error.isError(error) ? error.message : '').toContain(toPosixPath(at('locales/en.json')));
        expect(Error.isError(error) ? error.cause : undefined).toMatchObject({ message: 'boom' });
    });

    it('throws with the folder and the root when the folder sits outside root', async () => {
        using _built = register({ folders: ['/locales'], text: { '/locales/en.json': () => Promise.resolve('{}') } });

        const error = await rejection(readTextFiles('/elsewhere/locales'));

        expect(error).toMatchObject({ code: SeedcordErrorCode.CorePathOutsideRoot });
    });
});
