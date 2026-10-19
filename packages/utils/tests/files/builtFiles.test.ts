import { mkdtempDisposableSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it, onTestFinished, vi } from 'vitest';

import { encodeFile } from '#src/files/encodedFile';
import { toPosixPath } from '#src/files/paths';
import { readFiles, traverseDirectory } from '#src/files/readers';
import { BOT_FILES_KEY, BUILT_FILES_READY_KEY, builtConfigDir, setBuiltFilesHook, setDevFiles } from '#src/files/slots';
import { clearBuiltFiles } from '#tests/builtFilesSlot';

import type { EncodedFile } from '#src/files/encodedFile';
import type { BuiltSlot } from '#src/files/slots';
import type { TypedOmit } from '@seedcord/types';

// not on disk. path.resolve adds the drive letter on windows
const ROOT = path.resolve('/bot');

function at(relative: string): string {
    return path.join(ROOT, relative);
}

// writes the slot the way seedcord build's generated entry does
function register({
    root = ROOT,
    folders = [],
    listed = [],
    modules = {},
    listedFiles = {},
    ...rest
}: Partial<TypedOmit<BuiltSlot, 'kind'>>): Disposable {
    const slot: BuiltSlot = { kind: 'built', root, folders, listed, modules, listedFiles, ...rest };
    Reflect.set(globalThis, Symbol.for(BOT_FILES_KEY), slot);
    return { [Symbol.dispose]: clearBuiltFiles };
}

// a text file the way the build stores it
function storedText(text: string): () => Promise<EncodedFile> {
    return () => Promise.resolve(encodeFile(Buffer.from(text)));
}

// the generated entry's last line
function callReadyHook(): void {
    // justified: setBuiltFilesHook is the only writer of this key
    const hook = Reflect.get(globalThis, Symbol.for(BUILT_FILES_READY_KEY)) as (() => void) | undefined;
    hook?.();
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

describe('setBuiltFilesHook', () => {
    it('runs the hook right away when the built files are already written', () => {
        using _built = register({});
        const hook = vi.fn();

        setBuiltFilesHook(hook);

        expect(hook).toHaveBeenCalledOnce();
    });

    it('runs the hook once the generated entry writes the built files', () => {
        const hook = vi.fn();
        setBuiltFilesHook(hook);
        expect(hook).not.toHaveBeenCalled();

        using _built = register({});
        callReadyHook();

        expect(hook).toHaveBeenCalledOnce();
    });

    it('treats the root seedcord dev sets as no built files', () => {
        using _dev = setDevFiles({ root: ROOT, listed: [] });
        // setBuiltFilesHook keeps the hook it could not run yet
        onTestFinished(clearBuiltFiles);
        const hook = vi.fn();

        setBuiltFilesHook(hook);

        expect(hook).not.toHaveBeenCalled();
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

    it('reports a module of any code extension by the js file it built to', async () => {
        using _built = register({
            folders: ['/handlers'],
            modules: { '/handlers/Coin.mts': stub('Coin'), '/handlers/Dice.tsx': stub('Dice') }
        });

        await expect(walk(at('handlers'))).resolves.toEqual([
            [at('handlers/Coin.js'), 'Coin'],
            [at('handlers/Dice.js'), 'Dice']
        ]);
    });

    it('skips registered type declarations, the same as the disk walk', async () => {
        using _built = register({
            folders: ['/handlers'],
            modules: {
                '/handlers/types.d.ts': stub('types'),
                '/handlers/types.d.mts': stub('types'),
                '/handlers/A.ts': stub('A')
            }
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

    it('treats a folder whose name starts with two dots as a dot-folder inside root', async () => {
        using _built = register({ folders: ['/handlers'] });

        const error = await rejection(traverseDirectory(at('..cache')));

        expect(error).toMatchObject({ code: SeedcordErrorCode.CoreDirectorySkipped });
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

describe('readFiles in a built bot', () => {
    it('reads the registered files under the folder with their own extension', async () => {
        using _built = register({
            folders: ['/locales', '/tags'],
            listed: ['/locales', '/tags'],
            listedFiles: {
                '/locales/fr.json': storedText('{"hi":"salut"}'),
                '/tags/faq.md': storedText('# faq'),
                '/locales/en.json': storedText('{"hi":"hello"}')
            }
        });

        const seen: [string, string][] = [];
        for await (const { fullPath, bytes } of readFiles(at('locales'))) seen.push([fullPath, bytes.toString()]);

        expect(seen).toEqual([
            [at('locales/en.json'), '{"hi":"hello"}'],
            [at('locales/fr.json'), '{"hi":"salut"}']
        ]);
    });

    it('decodes a binary file the build stored as base64', async () => {
        const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0xff]);
        using _built = register({
            folders: ['/assets'],
            listed: ['/assets'],
            listedFiles: { '/assets/dot.png': () => Promise.resolve(encodeFile(png)) }
        });

        const seen: Buffer[] = [];
        for await (const { bytes } of readFiles(at('assets'))) seen.push(bytes);

        expect(seen).toEqual([png]);
    });

    it('skips the same files the disk walk skips', async () => {
        const file = storedText('{}');
        using _built = register({
            folders: ['/locales', '/locales/.cache'],
            listed: ['/locales'],
            listedFiles: {
                '/locales/Skipped.ts': file,
                '/locales/.hidden': file,
                '/locales/en.json.map': file,
                '/locales/.cache/cached.json': file,
                '/locales/en.json': file
            }
        });

        const seen: string[] = [];
        for await (const { fullPath } of readFiles(at('locales'))) seen.push(fullPath);

        expect(seen).toEqual([at('locales/en.json')]);
    });

    it('reports the file that failed to load by its path, keeping the original as the cause', async () => {
        const broken = (): Promise<EncodedFile> => Promise.reject(new Error('boom'));
        using _built = register({
            folders: ['/locales'],
            listed: ['/locales'],
            listedFiles: { '/locales/en.json': broken }
        });

        const error = await rejection(readFiles(at('locales')));

        expect(error).toMatchObject({ code: SeedcordErrorCode.CorePathUnreadable });
        expect(Error.isError(error) ? error.message : '').toContain(toPosixPath(at('locales/en.json')));
        expect(Error.isError(error) ? error.cause : undefined).toMatchObject({ message: 'boom' });
    });

    it('throws with the folder and the root when the folder sits outside root', async () => {
        using _built = register({
            folders: ['/locales'],
            listed: ['/locales'],
            listedFiles: { '/locales/en.json': storedText('{}') }
        });

        const error = await rejection(readFiles('/elsewhere/locales'));

        expect(error).toMatchObject({ code: SeedcordErrorCode.CorePathOutsideRoot });
    });

    it('reads a subfolder of a listed folder', async () => {
        using _built = register({
            folders: ['/locales', '/locales/en'],
            listed: ['/locales'],
            listedFiles: { '/locales/en/hi.json': storedText('{}') }
        });

        const seen: string[] = [];
        for await (const { fullPath } of readFiles(at('locales/en'))) seen.push(fullPath);

        expect(seen).toEqual([at('locales/en/hi.json')]);
    });

    it('throws CoreDirectorySkipped for a dot-folder inside a listed folder', async () => {
        using _built = register({ folders: ['/locales'], listed: ['/locales'] });

        const error = await rejection(readFiles(at('locales/.cache')));

        expect(error).toMatchObject({ code: SeedcordErrorCode.CoreDirectorySkipped });
    });

    it('throws CoreDirectoryNotListed with the folder for a folder files leaves out', async () => {
        using _built = register({ folders: ['/locales', '/tags'], listed: ['/locales'] });

        const error = await rejection(readFiles(at('tags')));

        expect(error).toMatchObject({ code: SeedcordErrorCode.CoreDirectoryNotListed });
        expect(Error.isError(error) ? error.message : '').toContain(toPosixPath(at('tags')));
    });
});
