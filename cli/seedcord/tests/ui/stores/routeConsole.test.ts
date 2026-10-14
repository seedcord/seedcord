import { LoggerChannelRegistry } from '@seedcord/logger';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { routeConsoleToLogs } from '#ui/stores/routeConsole';

import type { LogRecord, LogSinkHandle } from '@seedcord/types';

// no-console flags the calls these tests make on purpose
const terminal = console;

describe('routeConsoleToLogs', () => {
    let records: LogRecord[];
    let sink: LogSinkHandle;
    let restore: () => void;

    beforeEach(() => {
        records = [];
        sink = LoggerChannelRegistry.instance.installSink(
            { kind: 'capture', onLog: (record) => records.push(record) },
            { muteConsole: true }
        );
        restore = routeConsoleToLogs();
    });

    afterEach(() => {
        restore();
        sink.dispose();
    });

    it.each([
        ['table', () => terminal.table([{ id: 7 }]), 'info', '│ id │'],
        ['dir', () => terminal.dir({ nested: { deep: 1 } }), 'info', 'nested: { deep: 1 }'],
        ['count', () => terminal.count('hits'), 'info', 'hits: 1'],
        ['assert', () => terminal.assert(false, 'broke'), 'warn', 'Assertion failed: broke']
    ] as const)('sends console.%s to the logs', (_method, call, level, text) => {
        call();
        const record = records.find((logged) => logged.message.includes(text));
        expect(record).toMatchObject({ level, label: 'Console' });
    });

    it('sends console.trace as a Trace error with the stack from where it was called', () => {
        terminal.trace('cache miss', 3);

        const trace = records
            .flatMap((record) => record.args ?? [])
            .find((arg): arg is Error => Error.isError(arg) && arg.name === 'Trace');
        expect(trace?.message).toBe('cache miss 3');
        expect(trace?.stack?.split('\n')[1]).toContain('routeConsole.test.ts');
    });

    it('indents a log inside console.group', () => {
        terminal.group('outer');
        terminal.log('inner');
        terminal.groupEnd();
        expect(records.map((record) => record.message)).toEqual(['outer', '  inner']);
    });

    it("keeps a sink's own console.log out of the logs", () => {
        const echo = LoggerChannelRegistry.instance.installSink({
            kind: 'capture',
            onLog: (record) => terminal.log(`echo ${record.message}`)
        });
        try {
            terminal.log('first');
        } finally {
            echo.dispose();
        }
        expect(records.map((record) => record.message)).toEqual(['first']);
    });

    it('stops routing once restored', () => {
        restore();
        restore = () => undefined;
        terminal.table([{ id: 7 }]);
        expect(records).toEqual([]);
    });
});
