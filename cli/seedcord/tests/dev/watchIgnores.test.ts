import { appendFileSync, mkdirSync, mkdtempDisposableSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { posixRelative } from '@seedcord/utils/internal';
import { createServer } from 'vite';
import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest';

import { serverViteConfig } from '#commands/dev/runtime/devServerConfig';
import { mergeViteConfig } from '#core/modules/userCodeConfig';
import { ProjectFiles } from '#core/project/ProjectFiles';
import { watchedPath } from '#core/project/watchedPath';

import type { ResolvedSeedcordConfig } from '#core/config/schema';
import type { ViteDevServer } from 'vite';

const TEST_TIMEOUT_MS = 20_000;
// this timeout should be sufficient for most file watch events imo
const WATCH_TIMEOUT_MS = 10_000;

const SOURCE_FILE = '/src/logs/format.ts';
const DIST_SOURCE_FILE = '/src/dist/shape.ts';
const LOG_FILE = '/logs/combined.log';
const BUILT_FILE = '/build/index.mjs';

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

    for (const folder of ['logs', 'build', 'src/logs', 'src/dist']) mkdirSync(join(root, folder), { recursive: true });
    writeFileSync(join(root, 'bot.ts'), 'export const bot = 1;\n');
    writeFileSync(join(root, LOG_FILE), 'first line\n');
    writeFileSync(join(root, BUILT_FILE), 'export {};\n');
    writeFileSync(join(root, SOURCE_FILE), 'export const format = 1;\n');
    writeFileSync(join(root, DIST_SOURCE_FILE), 'export const shape = 1;\n');

    return root;
}

interface WatchedProject {
    watcher: ViteDevServer['watcher'];
    real: string;
    touchUntilReported: (file: string) => Promise<void>;
}

async function watchProject(root: string): Promise<WatchedProject> {
    const real = watchedPath(root);
    const reported = new Set<string>();

    const config: Pick<ResolvedSeedcordConfig, 'root' | 'configFile' | 'files' | 'target'> = {
        root,
        configFile: join(root, 'seedcord.config.ts'),
        files: [],
        target: { kind: 'server', start: undefined, outDir: join(root, 'build') }
    };
    const { layout } = new ProjectFiles(config);
    server = await createServer(
        mergeViteConfig(serverViteConfig(config, layout, root), {
            plugins: [
                {
                    name: 'record',
                    hotUpdate: ({ file }: { file: string }) => {
                        reported.add(`/${posixRelative(real, file)}`);
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

    it.each([SOURCE_FILE, DIST_SOURCE_FILE])(
        'still reports a source file at %s',
        async (file) => {
            const { touchUntilReported } = await watchProject(project());

            await expect(touchUntilReported(file)).resolves.toBeUndefined();
        },
        TEST_TIMEOUT_MS
    );

    it(
        'never watches outDir',
        async () => {
            const { watcher, real, touchUntilReported } = await watchProject(project());

            await touchUntilReported(SOURCE_FILE);

            expect(watcher.getWatched()[join(real, 'build')]).toBeUndefined();
        },
        TEST_TIMEOUT_MS
    );
});
