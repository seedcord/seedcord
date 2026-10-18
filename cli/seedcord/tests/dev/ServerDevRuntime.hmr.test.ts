import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { afterAll, describe, expect, it, vi } from 'vitest';

import { ServerDevRuntime } from '#commands/dev/runtime/ServerDevRuntime';

import { devContextFor } from './devConfigFor';

import type { DevEvent } from '#commands/dev/runtime/events';

const SCRATCH_ROOT = join(import.meta.dirname, '.hmr-fixture');

// imports by file url, the same way HmrModuleHandler loads a changed handler
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

        await writeFile(handler, "export const value = 'after';\n");

        await vi.waitFor(async () => expect(await read(url)).toBe('after'), { timeout: 10_000, interval: 200 });
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

        await writeFile(helper, "export const value = 'after';\n");

        await vi.waitFor(async () => expect(await read(url)).toBe('after'), { timeout: 10_000, interval: 200 });
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

    async function expectRestartRequired(events: DevEvent[]): Promise<void> {
        await vi.waitFor(() => expect(events).toContainEqual({ type: 'restart-required' }), { timeout: 10_000 });
    }

    // chokidar 3 to 5 emit ready before they watch nested folders when one of their paths is missing.
    // vite passes it every env file for the mode, existing or not
    async function saveUntilRestartRequired(file: string, text: string, events: DevEvent[]): Promise<void> {
        await vi.waitFor(
            async () => {
                await writeFile(file, text);
                expect(events).toContainEqual({ type: 'restart-required' });
            },
            { timeout: 10_000, interval: 200 }
        );
    }

    it('asks for a restart when a file the entry imports is saved', async () => {
        const { src, runtime, events } = await startedProject({
            'index.ts': "export { greeting } from './plugin';\n",
            'plugin.ts': "export const greeting = 'before';\n"
        });
        await runtime.loadEntry();

        await writeFile(join(src, 'plugin.ts'), "export const greeting = 'after';\n");

        await expectRestartRequired(events);
    }, 60_000);

    it('asks for a restart when a file two imports below the entry is saved', async () => {
        const { src, runtime, events } = await startedProject({
            'index.ts': "export { greeting } from './plugin';\n",
            'plugin.ts': "export { greeting } from './greeting';\n",
            'greeting.ts': "export const greeting = 'before';\n"
        });
        await runtime.loadEntry();

        await writeFile(join(src, 'greeting.ts'), "export const greeting = 'after';\n");

        await expectRestartRequired(events);
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

        await writeFile(join(src, 'field.ts'), "export const field = 'after';\n");

        await expectRestartRequired(events);
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
        ['seedcord.config.ts', 'export default { idleAnimation: false };\n'],
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

            await writeFile(join(dirname(src), envFile), 'GREETING=after\n');
            await expectRestartRequired(events);

            await expect(runtime.importModule(join(src, 'index.ts'))).resolves.toMatchObject({ ready: true });
        },
        20_000
    );
});
