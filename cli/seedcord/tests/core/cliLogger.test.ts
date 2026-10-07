import { LoggerChannelRegistry } from '@seedcord/logger';
import { beforeEach, describe, expect, it } from 'vitest';

import { cliLogger } from '#core/cliLogger';

import type { ILogSink, LogRecord } from '@seedcord/types';

class FakeSink implements ILogSink {
    public readonly records: LogRecord[] = [];
    public readonly kind = 'console';
    public onLog(record: LogRecord): void {
        this.records.push(record);
    }
}

const registry = LoggerChannelRegistry.instance;
let sink: FakeSink;

beforeEach(() => {
    registry.reset();
    sink = new FakeSink();
    registry.configure({ level: 'trace', sinks: [sink] });
});

describe('cliLogger', () => {
    it('logs on the cli channel under the given label', () => {
        cliLogger('Dev').info('ran');

        expect(sink.records[0]?.channel).toBe('cli');
        expect(sink.records[0]?.label).toBe('Dev');
    });
});
