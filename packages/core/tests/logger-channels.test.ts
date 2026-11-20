import { LoggerChannelRegistry } from '@seedcord/logger';
import { beforeEach, describe, expect, it } from 'vite-plus/test';

import { Bus, busLoggerOf } from '#subscribers/Bus';

import type { CoreBase } from '#interfaces/CoreBase';
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

// a typo in a channel literal is still fine because `LoggerChannelId` is a LiteralUnion.
// only the sites that construct without a host or a Discord client are pinned here.
describe('flat-site log channels', () => {
    it('puts the bus on the subscribers channel', () => {
        // justified: Bus reads only the host reference in its ctor
        busLoggerOf(new Bus({} as CoreBase)).info('ran');

        expect(sink.records[0]).toMatchObject({ channel: 'subscribers', label: 'Subscribers' });
    });
});
