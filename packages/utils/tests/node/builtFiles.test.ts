import { SeedcordErrorCode } from '@seedcord/errors';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { readTextFiles, registerBuiltFiles, traverseDirectory } from '#src/node/directory';

// not on disk
const ROOT = '/bot';

function stub(name: string): () => Promise<Record<string, unknown>> {
    return () => Promise.resolve({ name });
}

async function walk(dir: string): Promise<[string, unknown][]> {
    const seen: [string, unknown][] = [];
    for await (const { fullPath, imported } of traverseDirectory(dir)) seen.push([fullPath, imported.name]);
    return seen;
}

afterEach(() => {
    Reflect.deleteProperty(globalThis, Symbol.for('seedcord:utils:built-files'));
});

describe('traverseDirectory in a built bot', () => {
    it('visits the registered modules under the folder as built js files', async () => {
        registerBuiltFiles({
            root: ROOT,
            modules: {
                '/handlers/Roll.ts': stub('Roll'),
                '/handlers/mod/Ban.ts': stub('Ban'),
                '/commands/Ping.ts': stub('Ping')
            },
            text: {}
        });

        await expect(walk('/bot/handlers')).resolves.toEqual([
            ['/bot/handlers/Roll.js', 'Roll'],
            ['/bot/handlers/mod/Ban.js', 'Ban']
        ]);
    });

    it('loads nothing past the file the caller stopped at', async () => {
        const later = vi.fn(stub('Later'));
        registerBuiltFiles({
            root: ROOT,
            modules: { '/handlers/A.ts': stub('A'), '/handlers/B.ts': later },
            text: {}
        });

        for await (const { imported } of traverseDirectory('/bot/handlers')) {
            if (imported.name === 'A') break;
        }

        expect(later).not.toHaveBeenCalled();
    });

    it('treats a folder whose name starts with two dots as inside root', async () => {
        registerBuiltFiles({ root: ROOT, modules: { '/..cache/Warm.ts': stub('Warm') }, text: {} });

        await expect(walk('/bot/..cache')).resolves.toEqual([['/bot/..cache/Warm.js', 'Warm']]);
    });

    it('visits every module when the folder is root itself', async () => {
        registerBuiltFiles({ root: ROOT, modules: { '/index.ts': stub('index') }, text: {} });

        await expect(walk('/bot')).resolves.toEqual([['/bot/index.js', 'index']]);
    });

    it('yields nothing for a folder under root with no registered files', async () => {
        registerBuiltFiles({ root: ROOT, modules: { '/handlers/Roll.ts': stub('Roll') }, text: {} });

        await expect(walk('/bot/subscribers')).resolves.toEqual([]);
    });

    it('reports the file whose module failed to load, keeping the original as the cause', async () => {
        const broken = (): Promise<Record<string, unknown>> => Promise.reject(new Error('boom'));
        registerBuiltFiles({ root: ROOT, modules: { '/handlers/Broken.ts': broken }, text: {} });

        const error = await walk('/bot/handlers').catch((caught: unknown) => caught);

        expect(error).toMatchObject({ code: SeedcordErrorCode.CoreDirectoryImportFailed });
        expect(Error.isError(error) ? error.message : '').toMatch(/Broken\.js/);
        expect(Error.isError(error) ? error.cause : undefined).toMatchObject({ message: 'boom' });
    });

    it('throws with the folder and the root when the folder sits outside root', async () => {
        registerBuiltFiles({ root: ROOT, modules: { '/handlers/Roll.ts': stub('Roll') }, text: {} });

        const error = await walk('/elsewhere/handlers').catch((caught: unknown) => caught);

        expect(error).toMatchObject({ code: SeedcordErrorCode.CoreDirectoryOutsideRoot });
        expect(Error.isError(error) ? error.message : '').toMatch(/\/elsewhere\/handlers[\s\S]*\/bot/);
    });
});

describe('readTextFiles in a built bot', () => {
    it('reads the registered text under the folder with its own extension', async () => {
        registerBuiltFiles({
            root: ROOT,
            modules: {},
            text: {
                '/locales/en.json': () => Promise.resolve('{"hi":"hello"}'),
                '/locales/fr.json': () => Promise.resolve('{"hi":"salut"}'),
                '/tags/faq.md': () => Promise.resolve('# faq')
            }
        });

        const seen: [string, string][] = [];
        for await (const { fullPath, text } of readTextFiles('/bot/locales')) seen.push([fullPath, text]);

        expect(seen).toEqual([
            ['/bot/locales/en.json', '{"hi":"hello"}'],
            ['/bot/locales/fr.json', '{"hi":"salut"}']
        ]);
    });
});
