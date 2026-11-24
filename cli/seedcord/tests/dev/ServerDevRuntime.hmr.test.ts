import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { afterAll, describe, expect, it, vi } from 'vite-plus/test';

import { ServerDevRuntime } from '#commands/dev/runtime/ServerDevRuntime';
import { scratchPath } from '#tests/scratchPath';

import { devContextFor } from './devConfigFor';
import { saveUntil } from './saveUntil';

import type { DevEvent } from '#commands/dev/runtime/events';

const SCRATCH_ROOT = scratchPath('hmr-fixture');

// imports by file url, the same way FolderExports loads a changed file
const ENTRY = 'export async function read(url: string): Promise<string> { return (await import(url)).value; }\n';

describe('dev runtime hot reload', () => {
    const runtimes: ServerDevRuntime[] = [];

    afterAll(async () => {
        await Promise.all(runtimes.map((runtime) => runtime.stop()));
        await rm(SCRATCH_ROOT, { recursive: true, force: true });
    });

    it('imports the new code of a handler after it is saved', async () => {
        await mkdir(SCRATCH_ROOT, { recursive: true });
        const dir = await mkdtemp(join(SCRATCH_ROOT, 'dev-'));
        const handler = join(dir, 'src', 'handler.ts');
        await mkdir(join(dir, 'src'), { recursive: true });
        await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'hmr-fixture', type: 'module' }));
        await writeFile(join(dir, 'seedcord.config.ts'), 'export default {};\n');
        await writeFile(join(dir, 'src', 'index.ts'), ENTRY);
        await writeFile(handler, "export const value = 'before';\n");

        const runtime = new ServerDevRuntime();
        runtimes.push(runtime);
        await runtime.start(devContextFor(dir, 'index.ts'));

        const { module } = await runtime.loadEntry();
        // justified: ENTRY above declares read
        const { read } = module as { read: (url: string) => Promise<string> };
        const url = pathToFileURL(handler).href;
        expect(await read(url)).toBe('before');

        await saveUntil(handler, "export const value = 'after';\n", async () => expect(await read(url)).toBe('after'));
    }, 60_000);

    it('imports the new code of a helper when its handler is imported again', async () => {
        await mkdir(SCRATCH_ROOT, { recursive: true });
        const dir = await mkdtemp(join(SCRATCH_ROOT, 'dev-'));
        const handler = join(dir, 'src', 'handler.ts');
        const helper = join(dir, 'src', 'helper.ts');
        await mkdir(join(dir, 'src'), { recursive: true });
        await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'hmr-fixture', type: 'module' }));
        await writeFile(join(dir, 'seedcord.config.ts'), 'export default {};\n');
        await writeFile(join(dir, 'src', 'index.ts'), ENTRY);
        await writeFile(handler, "export { value } from './helper';\n");
        await writeFile(helper, "export const value = 'before';\n");

        const runtime = new ServerDevRuntime();
        runtimes.push(runtime);
        await runtime.start(devContextFor(dir, 'index.ts'));

        const { module } = await runtime.loadEntry();
        // justified: ENTRY above declares read
        const { read } = module as { read: (url: string) => Promise<string> };
        const url = pathToFileURL(handler).href;
        expect(await read(url)).toBe('before');

        await saveUntil(helper, "export const value = 'after';\n", async () => expect(await read(url)).toBe('after'));
    }, 60_000);

    async function startedProject(
        files: Record<string, string>,
        restart: string[] = []
    ): Promise<{ src: string; runtime: ServerDevRuntime; events: DevEvent[] }> {
        await mkdir(SCRATCH_ROOT, { recursive: true });
        const dir = await mkdtemp(join(SCRATCH_ROOT, 'dev-'));
        const src = join(dir, 'src');
        await mkdir(join(src, 'schema'), { recursive: true });
        await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'hmr-fixture', type: 'module' }));
        await writeFile(join(dir, 'seedcord.config.ts'), 'export default {};\n');
        for (const [file, text] of Object.entries(files)) await writeFile(join(src, file), text);
        const events: DevEvent[] = [];

        const runtime = new ServerDevRuntime();
        runtimes.push(runtime);
        const context = devContextFor(dir, 'index.ts');
        const config = { ...context.config, hmr: { restart, rollback: true } };
        await runtime.start({ ...context, config, onEvent: (event) => events.push(event) });
        return { src, runtime, events };
    }

    async function saveUntilRestartRequired(file: string, text: string, events: DevEvent[]): Promise<void> {
        await saveUntil(file, text, () => expect(events).toContainEqual({ type: 'restart-required' }));
    }

    it('asks for a restart when the bot reports a full reload', async () => {
        const { runtime, events } = await startedProject({
            'index.ts': "import.meta.hot?.send('seedcord:full-reload', {});\nexport const ready = true;\n"
        });

        await runtime.loadEntry();

        await vi.waitFor(() => expect(events).toContainEqual({ type: 'restart-required' }));
    }, 60_000);

    it('asks for a restart when a file the entry imports is saved', async () => {
        const { src, runtime, events } = await startedProject({
            'index.ts': "export { greeting } from './plugin';\n",
            'plugin.ts': "export const greeting = 'before';\n"
        });
        await runtime.loadEntry();

        await saveUntilRestartRequired(join(src, 'plugin.ts'), "export const greeting = 'after';\n", events);
    }, 60_000);

    it('asks for a restart when a file two imports below the entry is saved', async () => {
        const { src, runtime, events } = await startedProject({
            'index.ts': "export { greeting } from './plugin';\n",
            'plugin.ts': "export { greeting } from './greeting';\n",
            'greeting.ts': "export const greeting = 'before';\n"
        });
        await runtime.loadEntry();

        await saveUntilRestartRequired(join(src, 'greeting.ts'), "export const greeting = 'after';\n", events);
    }, 60_000);

    // records what the CLI sends, the way a started bot would get it
    const ASKING_BOT = `export { greeting } from './plugin';

export const received: [string, unknown][] = [];
import.meta.hot?.on('seedcord:bot-imports', (answer) => received.push(['seedcord:bot-imports', answer]));
import.meta.hot?.on('seedcord:hmr', (save) => {
    received.push(['seedcord:hmr', save]);
    if (save.file.endsWith('refused.ts')) import.meta.hot?.send('seedcord:restart-required', { file: save.file });
});
import.meta.hot?.send('seedcord:read-bot-imports', {});
`;

    async function startedAskingBot(files: Record<string, string>): Promise<{
        src: string;
        events: DevEvent[];
        received: [string, unknown][];
    }> {
        const { src, runtime, events } = await startedProject({ 'index.ts': ASKING_BOT, ...files });
        const { module } = await runtime.loadEntry();
        // justified: ASKING_BOT above exports received
        const { received } = module as { received: [string, unknown][] };
        // saving before the CLI gets the bot's question shows the restart card
        await vi.waitFor(() => expect(received).toHaveLength(1));
        return { src, events, received };
    }

    it('answers the bot with the files that the bot file imports', async () => {
        const { src, received } = await startedAskingBot({ 'plugin.ts': "export const greeting = 'before';\n" });

        expect(received).toEqual([['seedcord:bot-imports', { files: [join(src, 'plugin.ts')] }]]);
    }, 60_000);

    it('sends the bot a save that reaches the bot file, once the bot has asked for its imports', async () => {
        const { src, received } = await startedAskingBot({
            'plugin.ts': "export { greeting } from './greeting';\n",
            'greeting.ts': "export const greeting = 'before';\n"
        });
        const [greeting, plugin] = [join(src, 'greeting.ts'), join(src, 'plugin.ts')];

        await saveUntil(greeting, "export const greeting = 'after';\n", () =>
            expect(received).toContainEqual([
                'seedcord:hmr',
                expect.objectContaining({ file: greeting, affectedModules: [greeting, plugin], botImports: [plugin] })
            ])
        );
    }, 60_000);

    it('sends the bot the plugin that loads the saved file with import()', async () => {
        // the plugin has to start again to get the saved page because its import() may only run once, like in an init()
        const { src, received } = await startedAskingBot({
            'plugin.ts': "export const greeting = 'hello';\n\nexport const page = () => import('./page');\n",
            'page.ts': "export const text = 'before';\n"
        });
        const [pageFile, plugin] = [join(src, 'page.ts'), join(src, 'plugin.ts')];

        await saveUntil(pageFile, "export const text = 'after';\n", () =>
            expect(received).toContainEqual([
                'seedcord:hmr',
                expect.objectContaining({ file: pageFile, botImports: [plugin] })
            ])
        );
    }, 60_000);

    it("asks for a restart when the bot answers that it can't reload the save", async () => {
        const { src, events } = await startedAskingBot({
            'plugin.ts': "export { greeting } from './refused';\n",
            'refused.ts': "export const greeting = 'before';\n"
        });

        await saveUntilRestartRequired(join(src, 'refused.ts'), "export const greeting = 'after';\n", events);
    }, 60_000);

    it('asks for a restart when the bot file is saved, even after the bot asked for its imports', async () => {
        const { src, events } = await startedAskingBot({ 'plugin.ts': "export const greeting = 'before';\n" });

        await saveUntilRestartRequired(join(src, 'index.ts'), `${ASKING_BOT}\n`, events);
    }, 60_000);

    it('asks for a restart when a file that an hmr.restart match imports is saved', async () => {
        const { src, runtime, events } = await startedProject(
            {
                'index.ts': 'export const ready = true;\n',
                'schema/user.ts': "export { field } from '../field';\n",
                'field.ts': "export const field = 'before';\n"
            },
            ['schema/**']
        );
        await runtime.importModule(join(src, 'schema', 'user.ts'));

        await saveUntilRestartRequired(join(src, 'field.ts'), "export const field = 'after';\n", events);
    }, 60_000);

    it('asks for a restart when a file that no module imports matches hmr.restart', async () => {
        const { src, events } = await startedProject(
            { 'index.ts': 'export const ready = true;\n', 'schema/user.prisma': 'model User {}\n' },
            ['schema/**']
        );

        await saveUntilRestartRequired(join(src, 'schema', 'user.prisma'), 'model User { id Int }\n', events);
    }, 60_000);

    it('asks for a restart when an hmr.restart match outside root is saved', async () => {
        const { src, events } = await startedProject({ 'index.ts': 'export const ready = true;\n' }, ['../prisma/**']);
        const prisma = join(dirname(src), 'prisma');
        await mkdir(prisma, { recursive: true });
        await writeFile(join(prisma, 'schema.prisma'), 'model User {}\n');

        await saveUntilRestartRequired(join(prisma, 'schema.prisma'), 'model User { id Int }\n', events);
    }, 60_000);

    it.each([
        ['seedcord.config.ts', 'export default { dev: { idleAnimation: false } };\n'],
        ['.env', 'GREETING=after\n'],
        ['package.json', '{ "name": "hmr-fixture", "type": "module", "version": "1.0.1" }\n'],
        ['tsconfig.json', '{}\n']
    ])(
        'asks for a restart when %s beside the config is saved',
        async (file, text) => {
            const { src, events } = await startedProject({ 'index.ts': 'export const ready = true;\n' });

            await saveUntilRestartRequired(join(dirname(src), file), text, events);
        },
        60_000
    );

    it.each(['.env', '.env.development.local'])(
        'keeps importing modules after %s is saved',
        async (envFile) => {
            const { src, runtime, events } = await startedProject({ 'index.ts': 'export const ready = true;\n' });

            await saveUntilRestartRequired(join(dirname(src), envFile), 'GREETING=after\n', events);

            await expect(runtime.importModule(join(src, 'index.ts'))).resolves.toMatchObject({ ready: true });
        },
        20_000
    );
});
