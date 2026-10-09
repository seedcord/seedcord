import { appendFileSync, mkdirSync, mkdtempDisposableSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createServer, mergeConfig } from 'vite';
import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest';

import { devServerConfig, logsIgnore } from '#commands/dev/runtime/devServerConfig';

import type { ViteDevServer } from 'vite';

const TEST_TIMEOUT_MS = 20_000;
// this timeout should be sufficient for most file watch events imo
const WATCH_TIMEOUT_MS = 10_000;

const SOURCE_FILE = '/src/logs/format.ts';
const LOG_FILE = '/logs/combined.log';

let server: ViteDevServer | undefined;

afterEach(async () => {
    await server?.close();
    server = undefined;
});

// both files exist before the server starts
function project(): string {
    const scratch = mkdtempDisposableSync(join(tmpdir(), 'seedcord-watch-'));
    onTestFinished(() => scratch.remove());
    const root = scratch.path;

    mkdirSync(join(root, 'logs'), { recursive: true });
    mkdirSync(join(root, 'src', 'logs'), { recursive: true });
    writeFileSync(join(root, 'bot.ts'), 'export const bot = 1;\n');
    writeFileSync(join(root, LOG_FILE), 'first line\n');
    writeFileSync(join(root, SOURCE_FILE), 'export const format = 1;\n');

    return root;
}

interface WatchedProject {
    watcher: ViteDevServer['watcher'];
    // chokidar reports the resolved path, and a mac temp dir arrives through a symlink
    real: string;
    touchUntilReported: (file: string) => Promise<void>;
}

async function watchProject(root: string): Promise<WatchedProject> {
    const real = realpathSync(root);
    const reported = new Set<string>();

    server = await createServer(
        // the same merge ViteDevRuntime does
        mergeConfig(devServerConfig, {
            root,
            logLevel: 'error',
            server: { watch: { ignored: [logsIgnore(root)] } },
            plugins: [
                {
                    name: 'record',
                    hotUpdate: ({ file }: { file: string }) => {
                        reported.add(file.replace(real, ''));
                        return [];
                    }
                }
            ]
        })
    );
    // chokidar's ready can fire before a plugin hook can listen for it
    const { watcher } = server;
    await vi.waitFor(() => expect(watcher.getWatched()[join(real, 'src', 'logs')]).toContain('format.ts'), {
        timeout: WATCH_TIMEOUT_MS
    });

    // under load chokidar can miss a single write
    const touchUntilReported = (file: string): Promise<void> =>
        vi.waitFor(
            () => {
                appendFileSync(join(root, file), 'a line\n');
                expect(reported).toContain(file);
            },
            { timeout: WATCH_TIMEOUT_MS }
        );

    return { watcher, real, touchUntilReported };
}

describe('dev server watch ignores', () => {
    it(
        "never watches the bot's log folder",
        async () => {
            const { watcher, real, touchUntilReported } = await watchProject(project());

            await touchUntilReported(SOURCE_FILE);

            expect(watcher.getWatched()[join(real, 'logs')]).toBeUndefined();
        },
        TEST_TIMEOUT_MS
    );

    // the logs ignore is root-relative
    it(
        'still reports a source file under src/logs',
        async () => {
            const { touchUntilReported } = await watchProject(project());

            await expect(touchUntilReported(SOURCE_FILE)).resolves.toBeUndefined();
        },
        TEST_TIMEOUT_MS
    );
});
