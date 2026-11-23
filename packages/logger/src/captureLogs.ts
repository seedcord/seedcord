import { LoggerChannelRegistry } from './LoggerChannelRegistry';

import type { LogLevel, LogRecord } from '@seedcord/types';

export interface CapturedLogs extends Disposable {
    readonly records: readonly LogRecord[];
    at(level: LogLevel): string[];
    argsAt(level: LogLevel): unknown[];
}

export function captureLogs(): CapturedLogs {
    const registry = LoggerChannelRegistry.instance;
    const records: LogRecord[] = [];
    // a test run's floor is info which hides trace and debug records from a capture sink
    registry.configure({ level: 'trace', sinks: [] });
    const sink = registry.installSink({ kind: 'capture', onLog: (record) => records.push(record) });

    const atLevel = (level: LogLevel): LogRecord[] => records.filter((record) => record.level === level);

    return {
        records,
        at: (level) => atLevel(level).map((record) => record.message),
        argsAt: (level) => atLevel(level).flatMap((record) => record.args ?? []),
        [Symbol.dispose]: () => {
            sink.dispose();
            registry.configure({});
        }
    };
}
