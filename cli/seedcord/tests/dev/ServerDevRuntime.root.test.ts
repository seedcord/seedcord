import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { readTextFiles } from '@seedcord/utils/node';
import { afterAll, describe, expect, it } from 'vitest';

import { ServerDevRuntime } from '#commands/dev/runtime/ServerDevRuntime';

import { devConfigFor } from './devConfigFor';

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
        await Promise.all(runtimes.map((runtime) => runtime.dispose()));
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

    it('forgets root once the runtime is disposed', async () => {
        await mkdir(SCRATCH_ROOT, { recursive: true });
        const dir = await mkdtemp(join(SCRATCH_ROOT, 'dev-'));
        await writeProject(dir);

        const runtime = new ServerDevRuntime();
        await runtime.start({ config: devConfigFor(dir, 'index.ts') });
        await runtime.dispose();

        await expect(readTextFiles('./locales').next()).rejects.toMatchObject({
            code: SeedcordErrorCode.CoreDirectoryRootUnknown
        });
    }, 60_000);
});
