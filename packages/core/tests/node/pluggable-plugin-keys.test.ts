import { Logger } from '@seedcord/logger';
import { MemoryRateLimiter } from '@seedcord/rate-limiter';
import { describe, it, expect, afterEach } from 'vitest';

import { CoordinatedShutdown } from '@node/Lifecycle/CoordinatedShutdown';
import { CoordinatedStartup } from '@node/Lifecycle/CoordinatedStartup';
import { Pluggable } from '@node/Pluggable';
import { Plugin } from '@src/plugin/Plugin';
import { Bus } from '@subscribers/Bus';

import type { Config, IRateLimiter } from '@seedcord/types';

class TestPlugin extends Plugin {
    public logger = new Logger('TestPlugin');
    public init(): Promise<void> {
        return Promise.resolve();
    }
}

class TestHost extends Pluggable<'gateway', 'server'> {
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

describe('pluginKeys', () => {
    afterEach(() => {
        TestHost.resetHost();
    });

    it('is empty before anything attaches', () => {
        expect(new TestHost().pluginKeys).toEqual([]);
    });

    it('reports the keys in attach order', () => {
        const host = new TestHost();

        const attached = host.attach('db', TestPlugin).attach('cache', TestPlugin);

        expect(attached.pluginKeys).toEqual(['db', 'cache']);
    });
});
