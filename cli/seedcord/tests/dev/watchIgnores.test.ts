import { appendFileSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';

import { createServer, mergeConfig } from 'vite';
import { afterEach, describe, expect, it } from 'vitest';

import viteConfig, { logsIgnore } from '#commands/dev/runtime/vite.config';

import type { ViteDevServer } from 'vite';

const READY_POLL_MS = 50;
const READY_ATTEMPTS = 60;
const WATCH_MS = 2000;

let server: ViteDevServer | undefined;
const roots: string[] = [];

afterEach(async () => {
    await server?.close();
    server = undefined;

    while (roots.length > 0) rmSync(roots.pop() ?? '', { recursive: true, force: true });
});

// both files exist before the server starts
function project(): string {
    const root = mkdtempSync(join(tmpdir(), 'seedcord-watch-'));
    roots.push(root);

    mkdirSync(join(root, 'logs'), { recursive: true });
    mkdirSync(join(root, 'src', 'logs'), { recursive: true });
    writeFileSync(join(root, 'bot.ts'), 'export const bot = 1;\n');
    writeFileSync(join(root, 'logs', 'combined.log'), 'first line\n');
    writeFileSync(join(root, 'src', 'logs', 'format.ts'), 'export const format = 1;\n');

    return root;
}

// on linux chokidar lists a directory before it watches the files inside
async function untilWatching(watcher: ViteDevServer['watcher'], file: string): Promise<void> {
    for (let attempt = 0; attempt < READY_ATTEMPTS; attempt++) {
        if (watcher.getWatched()[dirname(file)]?.includes(basename(file))) return;
        await new Promise((resolve) => setTimeout(resolve, READY_POLL_MS));
    }

    throw new Error(`${file} was never watched. chokidar has: ${Object.keys(watcher.getWatched()).join(', ')}`);
}

async function filesTouchedAfterWriting(paths: readonly string[], root: string): Promise<string[]> {
    const touched: string[] = [];
    // chokidar reports the resolved path, and a mac temp dir arrives through a symlink
    const real = realpathSync(root);

    server = await createServer(
        // the same merge ViteDevRuntime does
        mergeConfig(viteConfig, {
            root,
            logLevel: 'error',
            server: { watch: { ignored: [logsIgnore(root)] } },
            plugins: [
                {
                    name: 'record',
                    hotUpdate: ({ file }: { file: string }) => {
                        touched.push(file.replace(real, ''));
                        return [];
                    }
                }
            ]
        })
    );

    // src/logs stays watched in both cases
    await untilWatching(server.watcher, join(real, 'src', 'logs', 'format.ts'));
    for (const path of paths) appendFileSync(path, 'a line\n');
    await new Promise((resolve) => setTimeout(resolve, WATCH_MS));

    return touched;
}

describe('dev server watch ignores', () => {
    it('stays quiet while the bot writes its log file', async () => {
        const root = project();

        const touched = await filesTouchedAfterWriting([join(root, 'logs', 'combined.log')], root);

        expect(touched).toEqual([]);
    });

    // the logs ignore is root-relative
    it('still reports a source file under src/logs', async () => {
        const root = project();

        const touched = await filesTouchedAfterWriting([join(root, 'src', 'logs', 'format.ts')], root);

        expect(touched.join(' ')).toContain('/src/logs/format.ts');
    });
});
