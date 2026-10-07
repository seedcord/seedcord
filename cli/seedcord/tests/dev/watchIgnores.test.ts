import { appendFileSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';

import { createServer, mergeConfig } from 'vite';
import { afterEach, describe, expect, it } from 'vitest';

import viteConfig, { logsIgnore } from '#commands/dev/runtime/vite.config';

import type { ViteDevServer } from 'vite';

const POLL_MS = 50;
const READY_ATTEMPTS = 60;
// 5s. a fixed 2s wait failed in 2 of 3 full CLI runs
const EVENT_ATTEMPTS = 100;
const TEST_TIMEOUT_MS = 20_000;
// i haven't measured this, just a guess
const LOG_GRACE_MS = 500;

const SOURCE_FILE = '/src/logs/format.ts';
const LOG_FILE = '/logs/combined.log';

let server: ViteDevServer | undefined;
const roots: string[] = [];

afterEach(async () => {
    await server?.close();
    server = undefined;

    while (roots.length > 0) rmSync(roots.pop() ?? '', { recursive: true, force: true });
});

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

// both files exist before the server starts
function project(): string {
    const root = mkdtempSync(join(tmpdir(), 'seedcord-watch-'));
    roots.push(root);

    mkdirSync(join(root, 'logs'), { recursive: true });
    mkdirSync(join(root, 'src', 'logs'), { recursive: true });
    writeFileSync(join(root, 'bot.ts'), 'export const bot = 1;\n');
    writeFileSync(join(root, LOG_FILE), 'first line\n');
    writeFileSync(join(root, SOURCE_FILE), 'export const format = 1;\n');

    return root;
}

// on linux chokidar lists a directory before it watches the files inside
async function untilWatching(watcher: ViteDevServer['watcher'], file: string): Promise<void> {
    for (let attempt = 0; attempt < READY_ATTEMPTS; attempt++) {
        if (watcher.getWatched()[dirname(file)]?.includes(basename(file))) return;
        await sleep(POLL_MS);
    }

    throw new Error(`${file} was never watched. chokidar has: ${Object.keys(watcher.getWatched()).join(', ')}`);
}

async function untilTouched(touched: readonly string[], file: string): Promise<void> {
    for (let attempt = 0; attempt < EVENT_ATTEMPTS; attempt++) {
        if (touched.includes(file)) return;
        await sleep(POLL_MS);
    }

    throw new Error(`${file} was never reported. vite reported: ${touched.join(', ') || 'nothing'}`);
}

// fills with root-relative paths as vite reports them
async function watchProject(root: string): Promise<string[]> {
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
    await untilWatching(server.watcher, join(real, SOURCE_FILE));
    return touched;
}

describe('dev server watch ignores', () => {
    it(
        'stays quiet while the bot writes its log file',
        async () => {
            const root = project();
            const touched = await watchProject(root);

            appendFileSync(join(root, LOG_FILE), 'a line\n');
            appendFileSync(join(root, SOURCE_FILE), 'a line\n');
            await untilTouched(touched, SOURCE_FILE);
            // the watcher does not promise events in write order
            await sleep(LOG_GRACE_MS);

            expect(touched).not.toContain(LOG_FILE);
        },
        TEST_TIMEOUT_MS
    );

    // the logs ignore is root-relative
    it(
        'still reports a source file under src/logs',
        async () => {
            const root = project();
            const touched = await watchProject(root);

            appendFileSync(join(root, SOURCE_FILE), 'a line\n');

            await expect(untilTouched(touched, SOURCE_FILE)).resolves.toBeUndefined();
        },
        TEST_TIMEOUT_MS
    );
});
