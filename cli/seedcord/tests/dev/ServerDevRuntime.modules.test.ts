import { mkdir, mkdtempDisposable, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it, onTestFinished, vi } from 'vitest';

import { ServerDevRuntime } from '#commands/dev/runtime/ServerDevRuntime';

import { devConfigFor } from './devConfigFor';

// the entry loads ban.ts the way traverseDirectory loads a command file
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
    const dir = temp.path;
    await writeProject(dir);

    const runtime = new ServerDevRuntime();
    onTestFinished(() => runtime.stop());
    await runtime.start({ config: devConfigFor(dir, 'index.ts') });
    const { module } = await runtime.loadEntry();

    return { runtime, ban: join(dir, 'src', 'commands', 'ban.ts'), entry: module };
}

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
