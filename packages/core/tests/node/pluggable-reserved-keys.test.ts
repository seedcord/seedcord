import { SeedcordErrorCode } from '@seedcord/errors';
import { Logger } from '@seedcord/logger';
import { MemoryRateLimiter } from '@seedcord/rate-limiter';
import { describe, it, expect, afterEach } from 'vitest';

import { CoordinatedShutdown } from '@node/Lifecycle/CoordinatedShutdown';
import { CoordinatedStartup } from '@node/Lifecycle/CoordinatedStartup';
import { Pluggable } from '@node/Pluggable';
import { Plugin } from '@src/plugin/Plugin';
import { Bus } from '@subscribers/Bus';

import type { Config, IRateLimiter } from '@seedcord/types';

class Anywhere extends Plugin {
    public logger = new Logger('Anywhere');
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

// a key built at runtime, past the compile gate
const widen = (value: string): string => value;

describe('a reserved framework channel as an attach key', () => {
    afterEach(() => {
        TestHost.resetHost();
    });

    it('rejects a literal key', () => {
        const host = new TestHost();

        // @ts-expect-error 'errors' is a reserved framework channel
        expect(() => host.attach('errors', Anywhere)).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CorePluginReservedChannel })
        );
    });

    it('rejects a literal read off a const object', () => {
        const host = new TestHost();
        const keys = { logs: 'events' } as const;

        // @ts-expect-error keys.logs is the literal 'events'
        expect(() => host.attach(keys.logs, Anywhere)).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CorePluginReservedChannel })
        );
    });

    it('throws for a key widened to string', () => {
        const host = new TestHost();

        expect(() => host.attach(widen('hmr'), Anywhere)).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CorePluginReservedChannel })
        );
    });

    // 'plugins' is also a member on the host, which would otherwise report the key-exists code
    it('reports the reserved code for a channel that collides with a host member', () => {
        const host = new TestHost();

        expect(() => host.attach(widen('plugins'), Anywhere)).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CorePluginReservedChannel })
        );
        expect(() => host.attach(widen('plugins'), Anywhere)).toThrow(/plugins/u);
    });

    it('leaves a key outside the reserved set alone', () => {
        const host = new TestHost();

        expect(host.attach('db', Anywhere).db).toBeInstanceOf(Anywhere);
    });
});
