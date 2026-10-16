import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { HostListenHost, HostShutdown } from '@seedcord/types/internal';
import { readTextFiles } from '@seedcord/utils/node';
import { afterAll, describe, expect, it, vi } from 'vitest';

import { ServerDevRuntime } from '#commands/dev/runtime/ServerDevRuntime';

import { devContextFor } from './devConfigFor';
import { fakeBot } from './fakes';

import type { StartedRuntime } from '#commands/dev/runtime/BaseDevRuntime';
import type { DevRuntimeContext } from '#commands/dev/runtime/DevRuntime';
import type { SeedcordInstance } from '@seedcord/types/internal';

const SCRATCH_ROOT = join(import.meta.dirname, '.root-fixture');

const ENTRY = [
    "import { readTextFiles } from '@seedcord/utils/node';",
    '',
    'export const texts: string[] = [];',
    "for await (const { text } of readTextFiles('./locales')) texts.push(text);",
    ''
].join('\n');

async function writeProject(dir: string): Promise<void> {
    await mkdir(join(dir, 'src', 'locales'), { recursive: true });

    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'root-fixture', type: 'module' }));
    await writeFile(join(dir, 'seedcord.config.ts'), 'export default {};\n');
    await writeFile(join(dir, 'src', 'locales', 'en.txt'), 'hello');
    await writeFile(join(dir, 'src', 'index.ts'), ENTRY);
}

describe('dev runtime with root set to src', () => {
    const runtimes: ServerDevRuntime[] = [];

    afterAll(async () => {
        await Promise.all(runtimes.map((runtime) => runtime.stop()));
        await rm(SCRATCH_ROOT, { recursive: true, force: true });
    });

    it('resolves a relative folder the bot reads against root', async () => {
        await mkdir(SCRATCH_ROOT, { recursive: true });
        const dir = await mkdtemp(join(SCRATCH_ROOT, 'dev-'));
        await writeProject(dir);

        const runtime = new ServerDevRuntime();
        runtimes.push(runtime);

        await runtime.start(devContextFor(dir, 'index.ts'));
        const { module } = await runtime.loadEntry();

        expect(module).toMatchObject({ texts: ['hello'] });
    }, 60_000);

    it('forgets root once the bot stops', async () => {
        await mkdir(SCRATCH_ROOT, { recursive: true });
        const dir = await mkdtemp(join(SCRATCH_ROOT, 'dev-'));
        await writeProject(dir);

        const runtime = new ServerDevRuntime();
        await runtime.start(devContextFor(dir, 'index.ts'));
        await runtime.stop();

        await expect(readTextFiles('./locales').next()).rejects.toMatchObject({
            code: SeedcordErrorCode.CoreDirectoryRootUnknown
        });
    }, 60_000);

    it('closes a runtime that was stopped while it started', async () => {
        await mkdir(SCRATCH_ROOT, { recursive: true });
        const dir = await mkdtemp(join(SCRATCH_ROOT, 'dev-'));
        await writeProject(dir);

        const runtime = new ServerDevRuntime();
        const starting = runtime.start(devContextFor(dir, 'index.ts'));
        await runtime.stop();
        await starting;

        await expect(readTextFiles('./locales').next()).rejects.toMatchObject({
            code: SeedcordErrorCode.CoreDirectoryRootUnknown
        });
    }, 60_000);

    it('finishes a second stop only once the runtime has closed', async () => {
        await mkdir(SCRATCH_ROOT, { recursive: true });
        const dir = await mkdtemp(join(SCRATCH_ROOT, 'dev-'));
        await writeProject(dir);

        const runtime = new ServerDevRuntime();
        await runtime.start(devContextFor(dir, 'index.ts'));
        const first = runtime.stop();
        await runtime.stop();

        await expect(readTextFiles('./locales').next()).rejects.toMatchObject({
            code: SeedcordErrorCode.CoreDirectoryRootUnknown
        });
        await first;
    }, 60_000);

    it("runs the bot's shutdown once however often it stops", async () => {
        await mkdir(SCRATCH_ROOT, { recursive: true });
        const dir = await mkdtemp(join(SCRATCH_ROOT, 'dev-'));
        await writeProject(dir);
        const shutdown = vi.fn(() => Promise.resolve());

        const runtime = new ServerDevRuntime();
        await runtime.start(devContextFor(dir, 'index.ts'));
        // justified: the lifecycle reads only start, the startup abort and the shutdown run
        await runtime.startBot(fakeBot({ [HostShutdown]: { run: shutdown } }) as unknown as SeedcordInstance);
        await runtime.stop();
        await runtime.stop();

        expect(shutdown).toHaveBeenCalledOnce();
    }, 60_000);

    it('closes what it opened when the start throws', async () => {
        await mkdir(SCRATCH_ROOT, { recursive: true });
        const dir = await mkdtemp(join(SCRATCH_ROOT, 'dev-'));
        await writeProject(dir);
        // opens vite for real, then fails the way a later setup step would
        class FailsAfterOpening extends ServerDevRuntime {
            protected override async open(
                context: DevRuntimeContext,
                resources: AsyncDisposableStack
            ): Promise<StartedRuntime> {
                await super.open(context, resources);
                throw new Error('setup failed');
            }
        }

        const runtime = new FailsAfterOpening();
        await expect(runtime.start(devContextFor(dir, 'index.ts'))).rejects.toThrow('setup failed');

        await expect(readTextFiles('./locales').next()).rejects.toMatchObject({
            code: SeedcordErrorCode.CoreDirectoryRootUnknown
        });
    }, 60_000);

    it.each([
        { tunnel: { mode: 'quick' }, host: '127.0.0.1' },
        { tunnel: { mode: 'url', url: 'https://bot.example.com' }, host: undefined },
        { tunnel: { mode: 'off' }, host: undefined }
    ] as const)(
        'sets the listen host on a bot when the tunnel mode is $tunnel.mode',
        async ({ tunnel, host }) => {
            await mkdir(SCRATCH_ROOT, { recursive: true });
            const dir = await mkdtemp(join(SCRATCH_ROOT, 'dev-'));
            await writeProject(dir);
            const bot = fakeBot();

            const runtime = new ServerDevRuntime();
            const context = devContextFor(dir, 'index.ts');
            await runtime.start({ ...context, config: { ...context.config, tunnel } });
            // justified: the lifecycle reads only start, the startup abort and the shutdown run
            await runtime.startBot(bot as unknown as SeedcordInstance);
            await runtime.stop();

            expect(bot[HostListenHost]).toBe(host);
        },
        60_000
    );

    it("still closes the runtime when the bot's shutdown throws", async () => {
        await mkdir(SCRATCH_ROOT, { recursive: true });
        const dir = await mkdtemp(join(SCRATCH_ROOT, 'dev-'));
        await writeProject(dir);
        const failingBot = fakeBot({ [HostShutdown]: { run: () => Promise.reject(new Error('shutdown failed')) } });

        const runtime = new ServerDevRuntime();
        await runtime.start(devContextFor(dir, 'index.ts'));
        // justified: the lifecycle reads only start, the startup abort and the shutdown run
        await runtime.startBot(failingBot as unknown as SeedcordInstance);

        await expect(runtime.stop()).rejects.toThrow('shutdown failed');
        await expect(readTextFiles('./locales').next()).rejects.toMatchObject({
            code: SeedcordErrorCode.CoreDirectoryRootUnknown
        });
    }, 60_000);
});
