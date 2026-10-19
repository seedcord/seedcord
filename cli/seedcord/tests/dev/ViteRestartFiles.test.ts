import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';

import { LoggerChannelRegistry } from '@seedcord/logger';
import { describe, expect, it, onTestFinished } from 'vite-plus/test';

import { ViteRestartFiles } from '#commands/dev/runtime/ViteRestartFiles';
import { WorkerEnv } from '#core/modules/workerEnv';
import { watchedPath } from '#core/project/watchedPath';
import { edgeFolder } from '#tests/edgeFolder';

import type { LogRecord } from '@seedcord/types';

// the files edge dev passes
async function configFiles(mode = 'development'): Promise<{ files: ViteRestartFiles; config: string }> {
    const { cloudflareConfig } = await edgeFolder();
    const { files } = await WorkerEnv.load(cloudflareConfig, mode);
    const restartFiles = new ViteRestartFiles(dirname(cloudflareConfig), [basename(cloudflareConfig), ...files]);
    return { files: restartFiles, config: cloudflareConfig };
}

describe('ViteRestartFiles', () => {
    it.each([
        ['cloudflare.config.ts', 'development', true],
        ['.dev.vars', 'development', true],
        ['.dev.vars.development', 'development', true],
        ['.env', 'development', true],
        ['.env.local', 'development', true],
        ['.env.development', 'development', true],
        ['.env.development.local', 'development', true],
        ['.env.production', 'development', false],
        ['.dev.vars.production', 'development', false],
        ['.env.example', 'development', false],
        ['.dev.vars.example', 'development', false],
        ['.envrc', 'development', false],
        ['.env.staging', 'staging', true],
        ['.env.staging.local', 'staging', true],
        ['.dev.vars.staging', 'staging', true],
        ['.env.development', 'staging', false]
    ] as const)('includes %s in mode %s: %s', async (name, mode, expected) => {
        const { files, config } = await configFiles(mode);

        expect(files.includes(join(dirname(watchedPath(config)), name))).toBe(expected);
    });

    it('includes cloudflare.config.ts written with forward slashes', async () => {
        const { files, config } = await configFiles();

        expect(files.includes(watchedPath(config).replaceAll('\\', '/'))).toBe(true);
    });

    it('leaves a .env in another folder out', async () => {
        const { files } = await configFiles();

        expect(files.includes(join(tmpdir(), 'elsewhere', '.env'))).toBe(false);
    });

    it('logs a warning when the watcher fails', async () => {
        const records: LogRecord[] = [];
        const handle = LoggerChannelRegistry.instance.installSink({ kind: 'capture', onLog: (r) => records.push(r) });
        onTestFinished(() => handle.dispose());
        const { files } = await configFiles();
        const watcher = files.watch(() => undefined);
        onTestFinished(() => watcher.close());

        watcher.emit('error', new Error('EMFILE: too many open files'));

        expect(records).toContainEqual(
            expect.objectContaining({ level: 'warn', message: expect.stringContaining('EMFILE') as string })
        );
    });
});
