import { mkdir, mkdtempDisposable, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { isSeedcordError } from '@seedcord/errors';
import { assert, describe, expect, it, onTestFinished } from 'vitest';

import { DevSession } from '#commands/dev/DevSession';
import { ViteDevRuntime } from '#commands/dev/runtime/ViteDevRuntime';
import { DevStore } from '#ui/stores/DevStore';

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

async function tempProject(): Promise<string> {
    const temp = await mkdtempDisposable(join(tmpdir(), 'dev-modules-'));
    onTestFinished(() => temp.remove());
    await writeProject(temp.path);
    return temp.path;
}

describe('dev session with a broken entry', () => {
    it('puts the entry path once in front of the parse error', async () => {
        const dir = await tempProject();
        const entry = join(dir, 'src', 'index.ts');
        await writeFile(entry, 'export const = ;\n');
        const config = { ...devConfigFor(dir, 'index.ts'), typecheck: { enabled: false } } as const;
        const session = new DevSession(config, new ViteDevRuntime(), new DevStore(), () => undefined);
        onTestFinished(() => session.dispose());

        const error: unknown = await session.start().catch((caught: unknown) => caught);

        assert(isSeedcordError(error));
        // vite's code frame repeats the path after this point
        const [prefix = '', reason] = error.message.split('Transform failed');
        expect(prefix.split(entry)).toHaveLength(2);
        expect(reason).toContain('Unexpected token');
    }, 60_000);
});

describe('dev runtime importModule', () => {
    it('returns the module the running bot already imported', async () => {
        const dir = await tempProject();

        const runtime = new ViteDevRuntime();
        onTestFinished(() => runtime.dispose());
        await runtime.start({ config: devConfigFor(dir, 'index.ts') });
        const { module } = await runtime.loadEntry();

        const ban = await runtime.importModule<{ marker: object }>(join(dir, 'src', 'commands', 'ban.ts'));

        expect(ban.marker).toBe((module as { ban: { marker: object } }).ban.marker);
    }, 60_000);
});
