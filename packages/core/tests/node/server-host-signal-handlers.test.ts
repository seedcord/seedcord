import { REST } from '@discordjs/rest';
import { MemoryRateLimiter } from '@seedcord/rate-limiter';
import { describe, it, expect, afterEach } from 'vitest';

import { CoordinatedShutdown } from '#node/Lifecycle/CoordinatedShutdown';
import { CoordinatedStartup } from '#node/Lifecycle/CoordinatedStartup';
import { ServerHost } from '#node/ServerHost';
import { Bus } from '#subscribers/Bus';

import type { Config, IRateLimiter } from '@seedcord/types';

class TestHost extends ServerHost<'gateway', 'server'> {
    // justified: startup reads config.errors and nothing else on Config
    public readonly config = { errors: { catchProcessErrors: false } } as Config;
    public readonly rest = new REST();
    public readonly applicationId = 'app-1';
    public readonly rateLimiter: IRateLimiter = new MemoryRateLimiter();
    public readonly bus: Bus;

    constructor() {
        super(new CoordinatedShutdown(), new CoordinatedStartup());
        this.bus = new Bus(this);
    }

    public run(): Promise<this> {
        return this.init();
    }

    public static resetHost(): void {
        ServerHost.reset();
    }
}

function signalListeners(): [sigterm: number, sigint: number] {
    return [process.listenerCount('SIGTERM'), process.listenerCount('SIGINT')];
}

describe('signal handlers on a plugin host', () => {
    afterEach(() => {
        TestHost.resetHost();
    });

    it('installs none while the bot is only constructed', () => {
        const before = signalListeners();

        // eslint-disable-next-line no-new -- construction is the behavior under test
        new TestHost();

        expect(signalListeners()).toEqual(before);
    });

    it('installs one SIGTERM and one SIGINT handler on start', async () => {
        const [sigterm, sigint] = signalListeners();
        const host = new TestHost();

        await host.run();

        expect(signalListeners()).toEqual([sigterm + 1, sigint + 1]);
    });

    it('releases them on reset after a start', async () => {
        const before = signalListeners();
        const host = new TestHost();
        await host.run();

        TestHost.resetHost();

        expect(signalListeners()).toEqual(before);
    });
});
