import { mkdir, mkdtempDisposable, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { LoggerChannelRegistry } from '@seedcord/logger';
import { describe, expect, it, onTestFinished, vi } from 'vitest';

import { TscRunner } from '#commands/dev/TscRunner';

import type { LogRecord } from '@seedcord/types';

const SPLIT_LINE = ['src/bot.ts(1,7): error TS2322: half ', 'of one line'] as const;

// writes one line in two chunks, then idles like tsc --watch
const FAKE_TSC = `
process.stderr.write(${JSON.stringify(SPLIT_LINE[0])});
setTimeout(() => process.stderr.write(${JSON.stringify(`${SPLIT_LINE[1]}\n`)}), 100);
setInterval(() => undefined, 1000);
`;

async function projectWithFakeTsc(): Promise<string> {
    const temp = await mkdtempDisposable(join(tmpdir(), 'seedcord-tsc-'));
    onTestFinished(() => temp.remove());
    const typescript = join(temp.path, 'node_modules', 'typescript');
    await mkdir(join(typescript, 'bin'), { recursive: true });
    await writeFile(join(temp.path, 'package.json'), JSON.stringify({ name: 'tsc-fixture' }));
    await writeFile(join(typescript, 'package.json'), JSON.stringify({ name: 'typescript', version: '0.0.0' }));
    await writeFile(join(typescript, 'bin', 'tsc'), FAKE_TSC);
    return temp.path;
}

describe('TscRunner', () => {
    it('logs a line tsc writes in two chunks as one line', async () => {
        const messages: string[] = [];
        const sink = LoggerChannelRegistry.instance.installSink({
            kind: 'capture',
            onLog: (record: LogRecord) => messages.push(record.message)
        });
        onTestFinished(() => sink.dispose());
        const runner = new TscRunner(undefined, await projectWithFakeTsc());
        onTestFinished(() => runner.stop());

        runner.start();

        await vi.waitFor(() => expect(messages).toContain(SPLIT_LINE.join('')));
        expect(messages).not.toContain(SPLIT_LINE[0].trimEnd());
    });

    it('stops when tsc failed to spawn', async () => {
        const messages: string[] = [];
        const sink = LoggerChannelRegistry.instance.installSink({
            kind: 'capture',
            onLog: (record: LogRecord) => messages.push(record.message)
        });
        onTestFinished(() => sink.dispose());
        const runner = new TscRunner(undefined, join(tmpdir(), 'seedcord-tsc-missing'));

        runner.start();
        await vi.waitFor(() => expect(messages).toContainEqual(expect.stringContaining('Failed to start tsc')));

        await expect(runner.stop()).resolves.toBeUndefined();
    }, 5000);
});
