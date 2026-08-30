import { REST } from '@discordjs/rest';
import { MemoryRateLimiter } from '@seedcord/rate-limiter';
import { HostPluginKeys } from '@seedcord/types/internal';
import { describe, it, expect, afterEach } from 'vitest';

import { CoordinatedShutdown } from '#node/Lifecycle/CoordinatedShutdown';
import { CoordinatedStartup } from '#node/Lifecycle/CoordinatedStartup';
import { Pluggable } from '#node/Pluggable';
import { Plugin } from '#src/plugin/Plugin';
import { Bus } from '#subscribers/Bus';

import type { Config, IRateLimiter } from '@seedcord/types';

class TestPlugin extends Plugin {
    public init(): Promise<void> {
        return Promise.resolve();
    }
}

class TestHost extends Pluggable<'gateway', 'server'> {
    public readonly config = {} as Config;
    public readonly rest = new REST();
    public readonly applicationId = 'app-1';
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
        expect(new TestHost()[HostPluginKeys]).toEqual([]);
    });

    it('reports the keys in attach order', () => {
        const host = new TestHost();

        const attached = host.attach('db', TestPlugin).attach('cache', TestPlugin);

        expect(attached[HostPluginKeys]).toEqual(['db', 'cache']);
    });
});
