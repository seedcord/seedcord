import { SeedcordErrorCode } from '@seedcord/errors';
import { afterEach, describe, expect, it } from 'vitest';

import { readTextFiles, registerBundledModules, traverseDirectory } from '#src/node/directory';

// no root on disk, the walk has to come from the table
const ROOT = '/bot';

function stub(name: string): () => Promise<Record<string, unknown>> {
    return () => Promise.resolve({ name });
}

async function walk(dir: string): Promise<[string, unknown][]> {
    const seen: [string, unknown][] = [];
    await traverseDirectory(dir, (fullPath, _relativePath, imported) => void seen.push([fullPath, imported.name]));
    return seen;
}

afterEach(() => {
    Reflect.deleteProperty(globalThis, Symbol.for('seedcord.bundledModules'));
});

describe('traverseDirectory with a registered table', () => {
    it('visits the table entries under the folder as built js files', async () => {
        registerBundledModules({
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

    it('treats a folder whose name starts with two dots as inside root', async () => {
        registerBundledModules({ root: ROOT, modules: { '/..cache/Warm.ts': stub('Warm') }, text: {} });

        await expect(walk('/bot/..cache')).resolves.toEqual([['/bot/..cache/Warm.js', 'Warm']]);
    });

    it('visits every entry when the folder is root itself', async () => {
        registerBundledModules({ root: ROOT, modules: { '/index.ts': stub('index') }, text: {} });

        await expect(walk('/bot')).resolves.toEqual([['/bot/index.js', 'index']]);
    });

    it('calls nothing for a folder under root with no entries', async () => {
        registerBundledModules({ root: ROOT, modules: { '/handlers/Roll.ts': stub('Roll') }, text: {} });

        await expect(walk('/bot/subscribers')).resolves.toEqual([]);
    });

    it('reports the file whose module failed to load, keeping the original as the cause', async () => {
        const broken = (): Promise<Record<string, unknown>> => Promise.reject(new Error('boom'));
        registerBundledModules({ root: ROOT, modules: { '/handlers/Broken.ts': broken }, text: {} });

        const error = await walk('/bot/handlers').catch((caught: unknown) => caught);

        expect(error).toMatchObject({ code: SeedcordErrorCode.CoreDirectoryImportFailed });
        expect(Error.isError(error) ? error.message : '').toMatch(/Broken\.js/);
        expect(Error.isError(error) ? error.cause : undefined).toMatchObject({ message: 'boom' });
    });

    it('throws with the folder and the root when the folder sits outside root', async () => {
        registerBundledModules({ root: ROOT, modules: { '/handlers/Roll.ts': stub('Roll') }, text: {} });

        const error = await walk('/elsewhere/handlers').catch((caught: unknown) => caught);

        expect(error).toMatchObject({ code: SeedcordErrorCode.CoreDirectoryOutsideRoot });
        expect(Error.isError(error) ? error.message : '').toMatch(/\/elsewhere\/handlers[\s\S]*\/bot/);
    });
});

describe('readTextFiles with a registered table', () => {
    it('reads the text entries under the folder with their own extension', async () => {
        registerBundledModules({
            root: ROOT,
            modules: {},
            text: {
                '/locales/en.json': () => Promise.resolve('{"hi":"hello"}'),
                '/locales/fr.json': () => Promise.resolve('{"hi":"salut"}'),
                '/tags/faq.md': () => Promise.resolve('# faq')
            }
        });

        const seen: [string, string][] = [];
        await readTextFiles('/bot/locales', (fullPath, _relativePath, text) => void seen.push([fullPath, text]));

        expect(seen).toEqual([
            ['/bot/locales/en.json', '{"hi":"hello"}'],
            ['/bot/locales/fr.json', '{"hi":"salut"}']
        ]);
    });
});
