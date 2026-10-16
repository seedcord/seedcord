import { realpathSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { LoggerChannelRegistry } from '@seedcord/logger';
import { describe, expect, it, onTestFinished } from 'vitest';

import { WorkerConfigFiles } from '#commands/dev/runtime/workerConfigFiles';

import type { LogRecord } from '@seedcord/types';

async function cloudflareConfigIn(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'seedcord-config-'));
    onTestFinished(() => rm(dir, { recursive: true, force: true }));
    const config = join(dir, 'cloudflare.config.ts');
    await writeFile(config, 'export default {};\n');
    return config;
}

describe('WorkerConfigFiles', () => {
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
        const config = await cloudflareConfigIn();
        const files = new WorkerConfigFiles(config, mode);

        expect(files.includes(join(dirname(realpathSync(config)), name))).toBe(expected);
    });

    it('leaves a .env in another folder out', async () => {
        const files = new WorkerConfigFiles(await cloudflareConfigIn(), 'development');

        expect(files.includes(join(tmpdir(), 'elsewhere', '.env'))).toBe(false);
    });

    it('logs a warning when the watcher fails', async () => {
        const records: LogRecord[] = [];
        const handle = LoggerChannelRegistry.instance.installSink({ kind: 'capture', onLog: (r) => records.push(r) });
        onTestFinished(() => handle.dispose());
        const watcher = new WorkerConfigFiles(await cloudflareConfigIn(), 'development').watch(() => undefined);
        onTestFinished(() => watcher.close());

        watcher.emit('error', new Error('EMFILE: too many open files'));

        expect(records).toContainEqual(
            expect.objectContaining({ level: 'warn', message: expect.stringContaining('EMFILE') as string })
        );
    });
});
