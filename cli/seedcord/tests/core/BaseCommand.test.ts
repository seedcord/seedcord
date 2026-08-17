import { LoggerChannelRegistry } from '@seedcord/logger';
import { beforeEach, describe, expect, it } from 'vitest';

import { BaseCommand } from '#core/BaseCommand';

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

class Probe extends BaseCommand {
    constructor() {
        super('probe', 'a probe', 'Probe');
    }
    public register(): void {
        this.logger.info('ran');
    }
    public summarize(): void {
        this.logger.utils.summary('Done', { steps: 1 });
    }
}

describe('BaseCommand logger', () => {
    it('logs on the cli channel under the given label', () => {
        new Probe().register();

        expect(sink.records[0]?.channel).toBe('cli');
        expect(sink.records[0]?.label).toBe('Probe');
    });
});
