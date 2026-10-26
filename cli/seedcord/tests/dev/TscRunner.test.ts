import { mkdir, mkdtempDisposable, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { LoggerChannelRegistry } from '@seedcord/logger';
import { describe, expect, it, onTestFinished, vi } from 'vitest';

import { TscRunner } from '#commands/dev/TscRunner';

import type { LogRecord } from '@seedcord/types';

const SPLIT_LINE = [
    'src/bot.ts:1:7 - \u001B[91merror\u001B[0m\u001B[90m TS2322: \u001B[0mhalf ',
    'of one line'
] as const;
const WATCH_STATUS = '\u001B[90m[6:10:00 PM]\u001B[0m Starting compilation in watch mode...';
const SOURCE_LINE = '\u001B[7m1\u001B[0m const count: number = "text";';

// writes one line in two chunks, then idles like tsc --watch
const FAKE_TSC = `
process.stdout.write(${JSON.stringify(`${WATCH_STATUS}\n`)});
process.stdout.write(${JSON.stringify(SPLIT_LINE[0])});
setTimeout(() => process.stdout.write(${JSON.stringify(`${SPLIT_LINE[1]}\n${SOURCE_LINE}\n  Type 'string' is not assignable to type 'number'.\n`)}), 100);
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
        LoggerChannelRegistry.instance.configure({ level: 'debug', sinks: [] });
        onTestFinished(() => LoggerChannelRegistry.instance.configure({}));
        const records: LogRecord[] = [];
        const sink = LoggerChannelRegistry.instance.installSink({
            kind: 'capture',
            onLog: (record: LogRecord) => records.push(record)
        });
        onTestFinished(() => sink.dispose());
        const runner = new TscRunner(undefined, await projectWithFakeTsc());
        onTestFinished(() => runner.stop());

        runner.start();

        await vi.waitFor(() =>
            expect(records).toContainEqual(expect.objectContaining({ message: SPLIT_LINE.join(''), level: 'error' }))
        );
        expect(records).toContainEqual(
            expect.objectContaining({ message: "  Type 'string' is not assignable to type 'number'.", level: 'error' })
        );
        expect(records).toContainEqual(expect.objectContaining({ message: SOURCE_LINE, level: 'error' }));
        expect(records).toContainEqual(expect.objectContaining({ message: WATCH_STATUS, level: 'debug' }));
        const messages = records.map((record) => record.message);
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
