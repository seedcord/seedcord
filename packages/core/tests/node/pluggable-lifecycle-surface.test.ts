import { REST } from '@discordjs/rest';
import { MemoryRateLimiter } from '@seedcord/rate-limiter';
import { HostShutdown, HostStartup } from '@seedcord/types/internal';
import { describe, it, expect, afterEach } from 'vitest';

import { CoordinatedShutdown } from '#node/Lifecycle/CoordinatedShutdown';
import { CoordinatedStartup } from '#node/Lifecycle/CoordinatedStartup';
import { Pluggable } from '#node/Pluggable';
import { ShutdownPhase, StartupPhase } from '#src/lifecycle/phases';
import { Bus } from '#subscribers/Bus';

import type { Config, IRateLimiter } from '@seedcord/types';

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

describe('the lifecycle surface a bot author reaches', () => {
    afterEach(() => {
        TestHost.resetHost();
    });

    it('carries addTask alone on shutdown', () => {
        const host = new TestHost();

        expect(Object.keys(host.shutdown)).toEqual(['addTask']);
        expect('run' in host.shutdown).toBe(false);
        expect('removeTask' in host.shutdown).toBe(false);
        expect('removeSignalHandlers' in host.shutdown).toBe(false);
    });

    it('carries addTask alone on startup', () => {
        const host = new TestHost();

        expect(Object.keys(host.startup)).toEqual(['addTask']);
        expect('run' in host.startup).toBe(false);
        expect('abort' in host.startup).toBe(false);
    });

    it('registers a shutdown task on the real lifecycle', () => {
        const host = new TestHost();

        host.shutdown.addTask(ShutdownPhase.Drain, 'probe', () => Promise.resolve());

        expect(host[HostShutdown].removeTask(ShutdownPhase.Drain, 'probe')).toBe(true);
    });

    it('registers a startup task on the real lifecycle', () => {
        const host = new TestHost();

        host.startup.addTask(StartupPhase.Ready, 'probe', () => Promise.resolve());

        expect(host[HostStartup].removeTask(StartupPhase.Ready, 'probe')).toBe(true);
    });
});
