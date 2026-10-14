import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { HostAugmentTarget, HostShutdown, HostStartup, HostVersion, SeedcordBrand } from '@seedcord/types/internal';
import { readTextFiles } from '@seedcord/utils/node';
import { afterAll, describe, expect, it } from 'vitest';

import { ServerDevRuntime } from '#commands/dev/runtime/ServerDevRuntime';

import { devConfigFor } from './devConfigFor';

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
        await Promise.all(runtimes.map((runtime) => runtime.stopBot()));
        await rm(SCRATCH_ROOT, { recursive: true, force: true });
    });

    it('resolves a relative folder the bot reads against root', async () => {
        await mkdir(SCRATCH_ROOT, { recursive: true });
        const dir = await mkdtemp(join(SCRATCH_ROOT, 'dev-'));
        await writeProject(dir);

        const runtime = new ServerDevRuntime();
        runtimes.push(runtime);

        await runtime.start({ config: devConfigFor(dir, 'index.ts') });
        const { module } = await runtime.loadEntry();

        expect(module).toMatchObject({ texts: ['hello'] });
    }, 60_000);

    it('forgets root once the bot stops', async () => {
        await mkdir(SCRATCH_ROOT, { recursive: true });
        const dir = await mkdtemp(join(SCRATCH_ROOT, 'dev-'));
        await writeProject(dir);

        const runtime = new ServerDevRuntime();
        await runtime.start({ config: devConfigFor(dir, 'index.ts') });
        await runtime.stopBot();

        await expect(readTextFiles('./locales').next()).rejects.toMatchObject({
            code: SeedcordErrorCode.CoreDirectoryRootUnknown
        });
    }, 60_000);

    it('closes a runtime that was stopped while it started', async () => {
        await mkdir(SCRATCH_ROOT, { recursive: true });
        const dir = await mkdtemp(join(SCRATCH_ROOT, 'dev-'));
        await writeProject(dir);

        const runtime = new ServerDevRuntime();
        const starting = runtime.start({ config: devConfigFor(dir, 'index.ts') });
        await runtime.stopBot();
        await starting;

        await expect(readTextFiles('./locales').next()).rejects.toMatchObject({
            code: SeedcordErrorCode.CoreDirectoryRootUnknown
        });
    }, 60_000);

    it("still closes the runtime when the bot's shutdown throws", async () => {
        await mkdir(SCRATCH_ROOT, { recursive: true });
        const dir = await mkdtemp(join(SCRATCH_ROOT, 'dev-'));
        await writeProject(dir);
        const failingBot = {
            [SeedcordBrand]: true,
            [HostVersion]: '1.2.3',
            [HostAugmentTarget]: '@seedcord/gateway',
            start: () => Promise.resolve(),
            [HostStartup]: { abort: () => undefined },
            [HostShutdown]: { run: () => Promise.reject(new Error('shutdown failed')) }
        };

        const runtime = new ServerDevRuntime();
        await runtime.start({ config: devConfigFor(dir, 'index.ts') });
        // justified: the lifecycle reads only start, the startup abort and the shutdown run
        await runtime.startBot(failingBot as unknown as SeedcordInstance);

        await expect(runtime.stopBot()).rejects.toThrow('shutdown failed');
        await expect(readTextFiles('./locales').next()).rejects.toMatchObject({
            code: SeedcordErrorCode.CoreDirectoryRootUnknown
        });
    }, 60_000);
});
