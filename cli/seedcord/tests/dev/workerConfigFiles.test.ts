import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { LoggerChannelRegistry } from '@seedcord/logger';
import { describe, expect, it, onTestFinished } from 'vitest';

import { watchWorkerConfig } from '#commands/dev/runtime/workerConfigFiles';

import type { LogRecord } from '@seedcord/types';

describe('watchWorkerConfig', () => {
    it('logs a warning when the watcher fails', async () => {
        const dir = await mkdtemp(join(tmpdir(), 'seedcord-watch-'));
        onTestFinished(() => rm(dir, { recursive: true, force: true }));
        const config = join(dir, 'wrangler.jsonc');
        await writeFile(config, '{}');
        const records: LogRecord[] = [];
        const handle = LoggerChannelRegistry.instance.installSink({ kind: 'capture', onLog: (r) => records.push(r) });
        onTestFinished(() => handle.dispose());
        const watcher = watchWorkerConfig(config, () => undefined);
        onTestFinished(() => watcher.close());

        watcher.emit('error', new Error('EMFILE: too many open files'));

        expect(records).toContainEqual(
            expect.objectContaining({ level: 'warn', message: expect.stringContaining('EMFILE') as string })
        );
    });
});
