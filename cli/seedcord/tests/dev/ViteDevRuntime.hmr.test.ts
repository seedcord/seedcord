import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { afterAll, describe, expect, it, vi } from 'vitest';

import { ViteDevRuntime } from '#commands/dev/runtime/ViteDevRuntime';

import { devConfigFor } from './devConfigFor';

const SCRATCH_ROOT = join(import.meta.dirname, '.hmr-fixture');

// HmrModuleHandler imports a changed handler by its file url, the same way
const ENTRY = 'export async function read(url: string): Promise<string> { return (await import(url)).value; }\n';

describe('dev runtime hot reload', () => {
    const runtimes: ViteDevRuntime[] = [];

    afterAll(async () => {
        await Promise.all(runtimes.map((runtime) => runtime.dispose()));
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

        const runtime = new ViteDevRuntime();
        runtimes.push(runtime);
        await runtime.start({ config: devConfigFor(dir, 'index.ts') });

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

        const runtime = new ViteDevRuntime();
        runtimes.push(runtime);
        await runtime.start({ config: devConfigFor(dir, 'index.ts') });

        const { module } = await runtime.loadEntry();
        // justified: ENTRY above declares read
        const { read } = module as { read: (url: string) => Promise<string> };
        const url = pathToFileURL(handler).href;
        expect(await read(url)).toBe('before');

        await writeFile(helper, "export const value = 'after';\n");

        await vi.waitFor(async () => expect(await read(url)).toBe('after'), { timeout: 10_000, interval: 200 });
    }, 60_000);
});
