import { LoggerChannelRegistry } from '@seedcord/logger';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HealthCheck } from '#node/HealthCheck';
import { Bus } from '#subscribers/Bus';

import type { CoreBase } from '#interfaces/CoreBase';
import type { CoordinatedShutdown } from '#node/Lifecycle/CoordinatedShutdown';
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

// `LoggerChannelId` is a LiteralUnion, so a typo in a channel literal is still fine.
// only the sites that construct without a host or a Discord client are pinned here.
describe('flat-site log channels', () => {
    it('puts the bus on the subscribers channel', () => {
        // justified: Bus reads only the host reference in its ctor
        new Bus({} as CoreBase).logger.info('ran');

        expect(sink.records[0]).toMatchObject({ channel: 'subscribers', label: 'Subscribers' });
    });

    it('puts the health check on the health channel', () => {
        // justified: the ctor only reaches addTask
        const shutdown = { addTask: vi.fn() } as unknown as CoordinatedShutdown;
        new HealthCheck(shutdown, { port: 0 }).logger.info('ran');

        expect(sink.records[0]).toMatchObject({ channel: 'health', label: 'HealthCheck' });
    });
});
