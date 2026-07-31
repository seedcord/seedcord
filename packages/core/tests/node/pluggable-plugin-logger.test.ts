import { LoggerChannelRegistry } from '@seedcord/logger';
import { MemoryRateLimiter } from '@seedcord/rate-limiter';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CoordinatedShutdown } from '@node/Lifecycle/CoordinatedShutdown';
import { CoordinatedStartup } from '@node/Lifecycle/CoordinatedStartup';
import { Pluggable } from '@node/Pluggable';
import { Plugin } from '@src/plugin/Plugin';
import { Bus } from '@subscribers/Bus';

import type { ILogSink, LogRecord } from '@seedcord/logger';
import type { Config, IRateLimiter } from '@seedcord/types';
import type { PluginContext } from '@src/plugin/context';

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

// no logger field, the base supplies it
class Database extends Plugin {
    public init(): Promise<void> {
        this.logger.info('connected');
        return Promise.resolve();
    }

    public reachCtx(): PluginContext {
        return this.ctx;
    }
}

class TestHost extends Pluggable<'gateway', 'server'> {
    // justified: the host reads nothing off config in these probes
    public readonly config = {} as Config;
    public readonly rateLimiter: IRateLimiter = new MemoryRateLimiter();
    public readonly bus: Bus;

    constructor() {
        super(new CoordinatedShutdown(), new CoordinatedStartup());
        this.bus = new Bus(this);
    }

    public static resetHost(): void {
        Pluggable.reset();
    }
}

describe('the plugin logger', () => {
    afterEach(() => {
        registry.reset();
        TestHost.resetHost();
    });

    it('exists without the plugin declaring one', async () => {
        const host = new TestHost();
        await host.attach('db', Database).db.init();

        expect(sink.records[0]?.label).toBe('Database');
    });

    it('moves onto the attach key as its channel', async () => {
        const host = new TestHost();
        await host.attach('db', Database).db.init();

        expect(sink.records[0]?.channel).toBe('db');
    });

    it('is the same instance ctx used to carry', () => {
        const host = new TestHost();
        const attached = host.attach('db', Database);

        // @ts-expect-error the base supplies the logger, ctx no longer carries one
        void attached.db.reachCtx().logger;
    });
});
