import { mkdir, mkdtempDisposable, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { stripVTControlCharacters } from 'node:util';

import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { assert, describe, expect, it, onTestFinished, vi } from 'vitest';

import { ServerDevRuntime } from '#commands/dev/runtime/ServerDevRuntime';
import { realPath } from '#core/project/realPath';
import { GREETING, GREETING_PROBE, greetingPlugin } from '#tests/greetingPlugin';
import { vitePluginsOf } from '#tests/vitePluginsOf';

import { devContextFor } from './devConfigFor';

// the entry loads ban.ts the way importFiles loads a command file
async function writeProject(dir: string): Promise<void> {
    await mkdir(join(dir, 'src', 'commands'), { recursive: true });
    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'dev-fixture', type: 'module' }));
    await writeFile(join(dir, 'seedcord.config.ts'), 'export default {};\n');
    await writeFile(join(dir, 'src', 'commands', 'ban.ts'), "export const marker = { version: 'before' };\n");
    await writeFile(
        join(dir, 'src', 'index.ts'),
        "export const ban = await import(new URL('./commands/ban.ts', import.meta.url).href);\n"
    );
}

interface Ban {
    marker: { version: string };
}

async function startedRuntime(): Promise<{ runtime: ServerDevRuntime; ban: string; entry: unknown }> {
    const temp = await mkdtempDisposable(join(tmpdir(), 'dev-modules-'));
    onTestFinished(() => temp.remove());
    const dir = realPath(temp.path);
    await writeProject(dir);

    const runtime = new ServerDevRuntime();
    onTestFinished(() => runtime.stop());
    await runtime.start(devContextFor(dir, 'index.ts'));
    const { module } = await runtime.loadEntry();

    return { runtime, ban: join(dir, 'src', 'commands', 'ban.ts'), entry: module };
}

describe('dev runtime mode', () => {
    it('runs the bot in the mode the shell sets', async () => {
        const temp = await mkdtempDisposable(join(tmpdir(), 'dev-mode-'));
        onTestFinished(() => temp.remove());
        await writeProject(temp.path);
        await writeFile(join(temp.path, 'src', 'mode.ts'), 'export const mode = import.meta.env.MODE;\n');
        const context = devContextFor(temp.path, 'mode.ts');
        const runtime = new ServerDevRuntime();
        onTestFinished(() => runtime.stop());

        await runtime.start({ ...context, config: { ...context.config, viteMode: 'staging' } });
        const { module } = await runtime.loadEntry();

        expect(module).toMatchObject({ mode: 'staging' });
    }, 60_000);
});

describe('dev runtime vitePlugins', () => {
    it("runs them on the bot's code", async () => {
        const temp = await mkdtempDisposable(join(tmpdir(), 'dev-vite-plugins-'));
        onTestFinished(() => temp.remove());
        await writeProject(temp.path);
        await writeFile(join(temp.path, 'src', 'greeting.ts'), GREETING_PROBE);
        const context = devContextFor(temp.path, 'greeting.ts');
        const runtime = new ServerDevRuntime();
        onTestFinished(() => runtime.stop());

        const vitePlugins = vitePluginsOf(() => [greetingPlugin()]);
        await runtime.start({ ...context, config: { ...context.config, vitePlugins } });
        const { module } = await runtime.loadEntry();

        expect(module).toMatchObject({ default: GREETING });
    }, 60_000);

    it('throws CoreVitePluginThrew for a plugin that throws while the dev server starts', async () => {
        const temp = await mkdtempDisposable(join(tmpdir(), 'dev-vite-plugins-'));
        onTestFinished(() => temp.remove());
        await writeProject(temp.path);
        const context = devContextFor(temp.path, 'index.ts');
        const vitePlugins = vitePluginsOf(
            () => [
                {
                    name: 'breaks-on-start',
                    configureServer: () => {
                        throw new Error('bad option');
                    }
                }
            ],
            context.config.configFile
        );
        const runtime = new ServerDevRuntime();
        onTestFinished(() => runtime.stop());

        const caught: unknown = await runtime
            .start({ ...context, config: { ...context.config, vitePlugins } })
            .catch((error: unknown) => error);

        assert(isSeedcordError(caught, 'SeedcordError', SeedcordErrorCode.CoreVitePluginThrew));
        expect(caught.message).toContain('breaks-on-start');
    }, 60_000);

    it.each(['load', 'transform'] as const)(
        'throws CoreVitePluginThrew with the file it was loading for a plugin that throws in %s',
        async (hook) => {
            const temp = await mkdtempDisposable(join(tmpdir(), 'dev-vite-plugins-'));
            onTestFinished(() => temp.remove());
            await writeProject(temp.path);
            await writeFile(join(temp.path, 'src', 'word.ts'), "export const word = 'ok';\n");
            await writeFile(join(temp.path, 'src', 'reexport.ts'), "export { word } from './word';\n");
            const throwOnWord = (id: string): undefined => {
                if (id.endsWith('/word.ts')) throw new Error('bad yaml on line 3');
                return undefined;
            };
            const context = devContextFor(temp.path, 'reexport.ts');
            const vitePlugins = vitePluginsOf(
                () => [
                    hook === 'load'
                        ? { name: 'breaks-the-word', load: throwOnWord }
                        : { name: 'breaks-the-word', transform: (_code: string, id: string) => throwOnWord(id) }
                ],
                context.config.configFile
            );
            const runtime = new ServerDevRuntime();
            onTestFinished(() => runtime.stop());
            await runtime.start({ ...context, config: { ...context.config, vitePlugins } });

            const caught: unknown = await runtime.loadEntry().catch((error: unknown) => error);

            assert(isSeedcordError(caught, 'SeedcordError', SeedcordErrorCode.CoreVitePluginThrew));
            const message = stripVTControlCharacters(caught.message);
            expect(message).toContain('breaks-the-word');
            expect(message).toContain(`its ${hook} hook`);
            expect(message).toContain('src/word.ts');
            expect(message).toContain('bad yaml on line 3');
        },
        60_000
    );
});

describe('dev runtime importModule', () => {
    it('returns the module the running bot already imported', async () => {
        const { runtime, ban, entry } = await startedRuntime();

        const imported = await runtime.importModule<Ban>(ban);

        expect(imported.marker).toBe((entry as { ban: Ban }).ban.marker);
    }, 60_000);

    it('returns the new code of a command after it is saved', async () => {
        const { runtime, ban } = await startedRuntime();

        await writeFile(ban, "export const marker = { version: 'after' };\n");

        await vi.waitFor(
            async () => {
                const { marker } = await runtime.importModule<Ban>(ban);
                expect(marker.version).toBe('after');
            },
            { timeout: 10_000, interval: 200 }
        );
    }, 60_000);

    it('rejects an import once the bot stops', async () => {
        const { runtime, ban } = await startedRuntime();

        await runtime.stop();

        expect(() => runtime.importModule(ban)).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CliDevRuntimeNotRunning })
        );
    }, 60_000);
});
