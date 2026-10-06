import path from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it, vi } from 'vitest';

import { BUILT_FILES_KEY, readTextFiles, traverseDirectory } from '#src/node/directory';

interface BuiltFileLoaders {
    root: string;
    folders: string[];
    modules: Record<string, () => Promise<Record<string, unknown>>>;
    text: Record<string, () => Promise<string>>;
}

// not on disk
const ROOT = '/bot';

// writes the slot the way seedcord build's generated entry does
function register({ root = ROOT, folders = [], modules = {}, text = {} }: Partial<BuiltFileLoaders>): void {
    Reflect.set(globalThis, Symbol.for(BUILT_FILES_KEY), { root, folders, modules, text });
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

describe('traverseDirectory in a built bot', () => {
    it('visits the registered modules under the folder as built js files', async () => {
        register({
            folders: ['/handlers', '/handlers/mod', '/commands'],
            modules: {
                '/handlers/mod/Ban.ts': stub('Ban'),
                '/commands/Ping.ts': stub('Ping'),
                '/handlers/Roll.ts': stub('Roll')
            }
        });

        await expect(walk('/bot/handlers')).resolves.toEqual([
            ['/bot/handlers/Roll.js', 'Roll'],
            ['/bot/handlers/mod/Ban.js', 'Ban']
        ]);
    });

    it('skips registered type declarations, the same as the disk walk', async () => {
        register({
            folders: ['/handlers'],
            modules: { '/handlers/types.d.ts': stub('types'), '/handlers/A.ts': stub('A') }
        });

        await expect(walk('/bot/handlers')).resolves.toEqual([['/bot/handlers/A.js', 'A']]);
    });

    it('loads nothing past the file the caller stopped at', async () => {
        const later = vi.fn(stub('Later'));
        register({ folders: ['/handlers'], modules: { '/handlers/A.ts': stub('A'), '/handlers/B.ts': later } });

        for await (const { imported } of traverseDirectory('/bot/handlers')) {
            if (imported.name === 'A') break;
        }

        expect(later).not.toHaveBeenCalled();
    });

    it('treats a folder whose name starts with two dots as inside root', async () => {
        register({ folders: ['/..cache'], modules: { '/..cache/Warm.ts': stub('Warm') } });

        await expect(walk('/bot/..cache')).resolves.toEqual([['/bot/..cache/Warm.js', 'Warm']]);
    });

    it('visits every module when the folder is root itself', async () => {
        register({ modules: { '/index.ts': stub('index') } });

        await expect(walk('/bot')).resolves.toEqual([['/bot/index.js', 'index']]);
    });

    it('visits every module when root is the filesystem root', async () => {
        register({ root: '/', folders: ['/handlers'], modules: { '/handlers/Roll.ts': stub('Roll') } });

        await expect(walk('/')).resolves.toEqual([['/handlers/Roll.js', 'Roll']]);
    });

    it('yields nothing for an empty folder the build registered', async () => {
        register({ folders: ['/handlers', '/subscribers'], modules: { '/handlers/Roll.ts': stub('Roll') } });

        await expect(walk('/bot/subscribers')).resolves.toEqual([]);
    });

    it('reports a folder the build never registered as unreadable', async () => {
        register({ folders: ['/handlers'], modules: { '/handlers/Roll.ts': stub('Roll') } });

        const error = await rejection(traverseDirectory('/bot/handlerz'));

        expect(error).toMatchObject({ code: SeedcordErrorCode.CoreDirectoryUnreadable });
        expect(Error.isError(error) ? error.message : '').toMatch(/handlerz/);
    });

    it('reports the file whose module failed to load, keeping the original as the cause', async () => {
        const broken = (): Promise<Record<string, unknown>> => Promise.reject(new Error('boom'));
        register({ folders: ['/handlers'], modules: { '/handlers/Broken.ts': broken } });

        const error = await rejection(traverseDirectory('/bot/handlers'));

        expect(error).toMatchObject({ code: SeedcordErrorCode.CoreDirectoryImportFailed });
        expect(Error.isError(error) ? error.message : '').toMatch(/Broken\.js/);
        expect(Error.isError(error) ? error.cause : undefined).toMatchObject({ message: 'boom' });
    });

    it('throws with the folder and the root when the folder sits outside root', async () => {
        register({ folders: ['/handlers'], modules: { '/handlers/Roll.ts': stub('Roll') } });

        const error = await rejection(traverseDirectory('/elsewhere/handlers'));

        expect(error).toMatchObject({ code: SeedcordErrorCode.CoreDirectoryOutsideRoot });
        expect(Error.isError(error) ? error.message : '').toMatch(/\/elsewhere\/handlers[\s\S]*\/bot/);
    });
});

describe('readTextFiles in a built bot', () => {
    it('reads the registered text under the folder with its own extension', async () => {
        register({
            folders: ['/locales', '/tags'],
            text: {
                '/locales/fr.json': () => Promise.resolve('{"hi":"salut"}'),
                '/tags/faq.md': () => Promise.resolve('# faq'),
                '/locales/en.json': () => Promise.resolve('{"hi":"hello"}')
            }
        });

        const seen: [string, string][] = [];
        for await (const { fullPath, text } of readTextFiles('/bot/locales')) seen.push([fullPath, text]);

        expect(seen).toEqual([
            ['/bot/locales/en.json', '{"hi":"hello"}'],
            ['/bot/locales/fr.json', '{"hi":"salut"}']
        ]);
    });

    it('skips the same files the disk walk skips', async () => {
        const text = (): Promise<string> => Promise.resolve('{}');
        register({
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
        for await (const { fullPath } of readTextFiles('/bot/locales')) seen.push(fullPath);

        expect(seen).toEqual(['/bot/locales/en.json']);
    });

    it('reports the file whose text failed to load by its relative path, keeping the original as the cause', async () => {
        const broken = (): Promise<string> => Promise.reject(new Error('boom'));
        register({ folders: ['/locales'], text: { '/locales/en.json': broken } });

        const error = await rejection(readTextFiles('/bot/locales'));

        expect(error).toMatchObject({ code: SeedcordErrorCode.CoreFileUnreadable });
        expect(Error.isError(error) ? error.message : '').toContain(
            path.relative(process.cwd(), '/bot/locales/en.json')
        );
        expect(Error.isError(error) ? error.cause : undefined).toMatchObject({ message: 'boom' });
    });

    it('throws with the folder and the root when the folder sits outside root', async () => {
        register({ folders: ['/locales'], text: { '/locales/en.json': () => Promise.resolve('{}') } });

        const error = await rejection(readTextFiles('/elsewhere/locales'));

        expect(error).toMatchObject({ code: SeedcordErrorCode.CoreDirectoryOutsideRoot });
    });
});
