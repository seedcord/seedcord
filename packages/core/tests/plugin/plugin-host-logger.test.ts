import { LoggerChannelRegistry } from '@seedcord/logger';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Plugin } from '#src/plugin/Plugin';
import { TestPluginHost } from '#tests/utils/TestPluginHost';

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

class Database extends Plugin {
    public init(): Promise<void> {
        this.logger.info('connected');
        return Promise.resolve();
    }
}

describe('the plugin logger', () => {
    afterEach(() => {
        registry.reset();
    });

    it('exists without the plugin declaring one', async () => {
        const host = new TestPluginHost();
        await host.attach('db', Database).db.init();

        expect(sink.records[0]?.label).toBe('Database');
    });

    it('moves onto the attach key as its channel', async () => {
        const host = new TestPluginHost();
        await host.attach('db', Database).db.init();

        expect(sink.records[0]?.channel).toBe('db');
    });

    it('keeps the whole dotted key as the channel of a grouped plugin', async () => {
        const host = new TestPluginHost();
        await host.attach('services.users', Database).services.users.init();

        expect(sink.records[0]?.channel).toBe('services.users');
    });
});
