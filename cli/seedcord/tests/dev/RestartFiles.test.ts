import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';

import { LoggerChannelRegistry } from '@seedcord/logger';
import { describe, expect, it, onTestFinished } from 'vitest';

import { RestartFiles } from '#commands/dev/runtime/RestartFiles';
import { WorkerEnv } from '#core/modules/workerEnv';
import { ProjectFiles } from '#core/project/ProjectFiles';
import { realPath } from '#core/project/realPath';
import { edgeFolder } from '#tests/edgeFolder';

import type { LogRecord } from '@seedcord/types';

// the files edge dev passes
async function configFiles(mode = 'development'): Promise<{ files: RestartFiles; config: string }> {
    const folder = await edgeFolder();
    const cloudflareConfig = realPath(folder.cloudflareConfig);
    const dir = realPath(dirname(cloudflareConfig));
    const { files } = await WorkerEnv.load(cloudflareConfig, mode);
    const paths = {
        root: dir,
        configFile: realPath(join(dir, 'seedcord.config.ts')),
        files: [],
        target: { kind: 'server', start: undefined, outDir: realPath(join(dir, 'dist')) }
    } as const;
    const config = { ...paths, instance: realPath(join(dir, 'bot.ts')), viteMode: mode };
    const { layout } = new ProjectFiles({ ...paths, files: [] });
    return {
        files: new RestartFiles(config, layout, [basename(cloudflareConfig), ...files]),
        config: cloudflareConfig
    };
}

describe('RestartFiles', () => {
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
    ] as const)('hides %s from vite in mode %s: %s', async (name, mode, expected) => {
        const { files, config } = await configFiles(mode);

        expect(files.hiddenFromVite(join(dirname(config), name))).toBe(expected);
    });

    it('hides cloudflare.config.ts written with forward slashes', async () => {
        const { files, config } = await configFiles();

        expect(files.hiddenFromVite(config.replaceAll('\\', '/'))).toBe(true);
    });

    it.each([
        ['pnpm-lock.yaml', true],
        ['tsconfig.build.json', true],
        ['src/package.json', false],
        ['src/tsconfig.json', false]
    ])('asks for a restart when %s is saved: %s', async (file, expected) => {
        const { files, config } = await configFiles();

        expect(files.needsRestart(join(dirname(config), file))).toBe(expected);
    });

    it('leaves a .env in another folder out', async () => {
        const { files } = await configFiles();

        expect(files.hiddenFromVite(join(tmpdir(), 'elsewhere', '.env'))).toBe(false);
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
