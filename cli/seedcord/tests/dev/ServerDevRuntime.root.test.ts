import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { HostListenHost, HostShutdown } from '@seedcord/types/internal';
import { readFiles } from '@seedcord/utils';
import { afterAll, describe, expect, it, vi } from 'vitest';

import { ServerDevRuntime } from '#commands/dev/runtime/ServerDevRuntime';
import { ProjectFiles } from '#core/project/ProjectFiles';
import { realPath } from '#core/project/realPath';

import { devContextFor } from './devConfigFor';
import { fakeBot } from './fakes';

import type { StartedRuntime } from '#commands/dev/runtime/BaseDevRuntime';
import type { DevRuntimeContext } from '#commands/dev/runtime/DevRuntime';
import type { SeedcordInstance } from '@seedcord/types/internal';

const SCRATCH_ROOT = join(import.meta.dirname, '.root-fixture');

const ENTRY = [
    "import { readFiles } from '@seedcord/utils';",
    '',
    'export const texts: string[] = [];',
    "for await (const { bytes } of readFiles('./locales')) texts.push(bytes.toString());",
    ''
].join('\n');

const HANDLERS_ENTRY = [
    "import { importFiles } from '@seedcord/utils';",
    '',
    'export const names: unknown[] = [];',
    "for await (const { imported } of importFiles('./handlers')) names.push(imported.name);",
    ''
].join('\n');

function contextListing(dir: string, files: string[]): DevRuntimeContext {
    const context = devContextFor(dir, 'index.ts');
    const config = { ...context.config, files: files.map((folder) => realPath(folder)) };
    return { ...context, config, files: new ProjectFiles(config) };
}

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

        await runtime.start(contextListing(dir, [join(dir, 'src', 'locales')]));
        const { module } = await runtime.loadEntry();

        expect(module).toMatchObject({ texts: ['hello'] });
    }, 60_000);

    it('throws CoreDirectoryNotListed for a text folder that files leaves out', async () => {
        await mkdir(SCRATCH_ROOT, { recursive: true });
        const dir = await mkdtemp(join(SCRATCH_ROOT, 'dev-'));
        await writeProject(dir);

        const runtime = new ServerDevRuntime();
        runtimes.push(runtime);

        await runtime.start(contextListing(dir, []));

        await expect(runtime.loadEntry()).rejects.toMatchObject({
            code: SeedcordErrorCode.CoreImportFailed,
            cause: { code: SeedcordErrorCode.CoreDirectoryNotListed }
        });
    }, 60_000);

    it('imports .tsx and .mts files from a folder the bot walks', async () => {
        await mkdir(SCRATCH_ROOT, { recursive: true });
        const dir = await mkdtemp(join(SCRATCH_ROOT, 'dev-'));
        await writeProject(dir);
        await mkdir(join(dir, 'src', 'handlers'));
        await writeFile(join(dir, 'src', 'handlers', 'Dice.tsx'), "export const name = 'Dice';\n");
        await writeFile(join(dir, 'src', 'handlers', 'Coin.mts'), "export const name = 'Coin';\n");
        await writeFile(join(dir, 'src', 'walk.ts'), HANDLERS_ENTRY);

        const runtime = new ServerDevRuntime();
        runtimes.push(runtime);

        await runtime.start(devContextFor(dir, 'walk.ts'));
        const { module } = await runtime.loadEntry();

        expect(module).toMatchObject({ names: ['Coin', 'Dice'] });
    }, 60_000);

    it('reads VITE_ values from the .env beside the config', async () => {
        await mkdir(SCRATCH_ROOT, { recursive: true });
        const dir = await mkdtemp(join(SCRATCH_ROOT, 'dev-'));
        await writeProject(dir);
        await writeFile(join(dir, '.env'), 'VITE_GREETING=hi from the project\n');
        await writeFile(join(dir, 'src', 'env.ts'), 'export const greeting = import.meta.env.VITE_GREETING;\n');

        const runtime = new ServerDevRuntime();
        runtimes.push(runtime);

        await runtime.start(devContextFor(dir, 'env.ts'));
        const { module } = await runtime.loadEntry();

        expect(module).toMatchObject({ greeting: 'hi from the project' });
    }, 60_000);

    it('forgets root once the bot stops', async () => {
        await mkdir(SCRATCH_ROOT, { recursive: true });
        const dir = await mkdtemp(join(SCRATCH_ROOT, 'dev-'));
        await writeProject(dir);

        const runtime = new ServerDevRuntime();
        await runtime.start(devContextFor(dir, 'index.ts'));
        await runtime.stop();

        await expect(readFiles('./locales').next()).rejects.toMatchObject({
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

        await expect(readFiles('./locales').next()).rejects.toMatchObject({
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

        await expect(readFiles('./locales').next()).rejects.toMatchObject({
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

        await expect(readFiles('./locales').next()).rejects.toMatchObject({
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
        await expect(readFiles('./locales').next()).rejects.toMatchObject({
            code: SeedcordErrorCode.CoreDirectoryRootUnknown
        });
    }, 60_000);
});
