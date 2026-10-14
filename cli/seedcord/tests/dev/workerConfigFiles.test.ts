import { realpathSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { LoggerChannelRegistry } from '@seedcord/logger';
import { describe, expect, it, onTestFinished } from 'vitest';

import { WorkerConfigFiles } from '#commands/dev/runtime/workerConfigFiles';

import type { LogRecord } from '@seedcord/types';

async function wranglerConfigIn(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'seedcord-config-'));
    onTestFinished(() => rm(dir, { recursive: true, force: true }));
    const config = join(dir, 'wrangler.jsonc');
    await writeFile(config, '{}');
    return config;
}

describe('WorkerConfigFiles', () => {
    it.each([
        ['wrangler.jsonc', undefined, true],
        ['.dev.vars', undefined, true],
        ['.env', undefined, true],
        ['.env.local', undefined, true],
        ['.env.example', undefined, false],
        ['.dev.vars.example', undefined, false],
        ['.env.staging', undefined, false],
        ['.envrc', undefined, false],
        ['.dev.vars.staging', 'staging', true],
        ['.env.staging', 'staging', true],
        ['.env.staging.local', 'staging', true],
        ['.env.production', 'staging', false],
        ['.env', 'staging', true]
    ] as const)('includes %s with CLOUDFLARE_ENV=%s: %s', async (name, environment, expected) => {
        const config = await wranglerConfigIn();
        const files = new WorkerConfigFiles(config, environment);

        expect(files.includes(join(dirname(realpathSync(config)), name))).toBe(expected);
    });

    it('leaves a .env in another folder out', async () => {
        const files = new WorkerConfigFiles(await wranglerConfigIn(), undefined);

        expect(files.includes(join(tmpdir(), 'elsewhere', '.env'))).toBe(false);
    });

    it('logs a warning when the watcher fails', async () => {
        const records: LogRecord[] = [];
        const handle = LoggerChannelRegistry.instance.installSink({ kind: 'capture', onLog: (r) => records.push(r) });
        onTestFinished(() => handle.dispose());
        const watcher = new WorkerConfigFiles(await wranglerConfigIn(), undefined).watch(() => undefined);
        onTestFinished(() => watcher.close());

        watcher.emit('error', new Error('EMFILE: too many open files'));

        expect(records).toContainEqual(
            expect.objectContaining({ level: 'warn', message: expect.stringContaining('EMFILE') as string })
        );
    });
});
