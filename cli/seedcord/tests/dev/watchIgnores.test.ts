import { appendFileSync, mkdirSync, mkdtempDisposableSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createServer, mergeConfig } from 'vite';
import { afterEach, describe, expect, it, onTestFinished } from 'vitest';

import { devServerConfig, logsIgnore } from '#commands/dev/runtime/devServerConfig';

import type { ViteDevServer } from 'vite';

const TEST_TIMEOUT_MS = 20_000;

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
    reported: (file: string) => Promise<undefined>;
}

async function watchProject(root: string): Promise<WatchedProject> {
    const real = realpathSync(root);
    const ready = Promise.withResolvers<undefined>();
    const reports = new Map<string, PromiseWithResolvers<undefined>>();
    const reportOf = (file: string): PromiseWithResolvers<undefined> => {
        const report = reports.get(file) ?? Promise.withResolvers<undefined>();
        reports.set(file, report);
        return report;
    };

    server = await createServer(
        // the same merge ViteDevRuntime does
        mergeConfig(devServerConfig, {
            root,
            logLevel: 'error',
            server: { watch: { ignored: [logsIgnore(root)] } },
            plugins: [
                {
                    name: 'record',
                    // chokidar emits ready once its file watchers are attached
                    configureServer: ({ watcher }: ViteDevServer) => {
                        watcher.once('ready', () => ready.resolve(undefined));
                    },
                    hotUpdate: ({ file }: { file: string }) => {
                        reportOf(file.replace(real, '')).resolve(undefined);
                        return [];
                    }
                }
            ]
        })
    );
    await ready.promise;

    return { watcher: server.watcher, real, reported: (file) => reportOf(file).promise };
}

describe('dev server watch ignores', () => {
    it(
        "never watches the bot's log folder",
        async () => {
            const { watcher, real } = await watchProject(project());
            const watched = watcher.getWatched();

            expect(watched[join(real, 'src', 'logs')]).toContain('format.ts');
            expect(watched[join(real, 'logs')]).toBeUndefined();
        },
        TEST_TIMEOUT_MS
    );

    // the logs ignore is root-relative
    it(
        'still reports a source file under src/logs',
        async () => {
            const root = project();
            const { reported } = await watchProject(root);

            appendFileSync(join(root, SOURCE_FILE), 'a line\n');

            await expect(reported(SOURCE_FILE)).resolves.toBeUndefined();
        },
        TEST_TIMEOUT_MS
    );
});
