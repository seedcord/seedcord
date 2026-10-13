import { mkdir, mkdtempDisposable, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, onTestFinished } from 'vitest';

import { ViteDevRuntime } from '#commands/dev/runtime/ViteDevRuntime';

import { devConfigFor } from './devConfigFor';

// the entry loads ban.ts the way traverseDirectory loads a command file
async function writeProject(dir: string): Promise<void> {
    await mkdir(join(dir, 'src', 'commands'), { recursive: true });
    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'dev-fixture', type: 'module' }));
    await writeFile(join(dir, 'seedcord.config.ts'), 'export default {};\n');
    await writeFile(join(dir, 'src', 'commands', 'ban.ts'), 'export const marker = {};\n');
    await writeFile(
        join(dir, 'src', 'index.ts'),
        "export const ban = await import(new URL('./commands/ban.ts', import.meta.url).href);\n"
    );
}

describe('dev runtime importModule', () => {
    it('returns the module the running bot already imported', async () => {
        const temp = await mkdtempDisposable(join(tmpdir(), 'dev-modules-'));
        onTestFinished(() => temp.remove());
        const dir = temp.path;
        await writeProject(dir);

        const runtime = new ViteDevRuntime();
        onTestFinished(() => runtime.dispose());
        await runtime.start({ config: devConfigFor(dir, 'index.ts') });
        const { module } = await runtime.loadEntry();

        const ban = await runtime.importModule<{ marker: object }>(join(dir, 'src', 'commands', 'ban.ts'));

        expect(ban.marker).toBe((module as { ban: { marker: object } }).ban.marker);
    }, 60_000);
});
