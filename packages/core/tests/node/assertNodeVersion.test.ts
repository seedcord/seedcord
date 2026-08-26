import { REST } from '@discordjs/rest';
import { SeedcordErrorCode } from '@seedcord/errors';
import { MemoryRateLimiter } from '@seedcord/rate-limiter';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { assertNodeVersion } from '#node/assertNodeVersion';
import { CoordinatedShutdown } from '#node/Lifecycle/CoordinatedShutdown';
import { CoordinatedStartup } from '#node/Lifecycle/CoordinatedStartup';
import { Pluggable } from '#node/Pluggable';
import { Bus } from '#subscribers/Bus';

import type { Config, IRateLimiter } from '@seedcord/types';

class TestHost extends Pluggable<'gateway', 'server'> {
    public readonly config = {} as Config;
    public readonly rest = new REST();
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

describe('assertNodeVersion', () => {
    it('throws when the running version is below the declared range', () => {
        expect(() => assertNodeVersion('>=24.11', 'v22.18.0')).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.UnsupportedNodeVersion })
        );
    });

    it('passes a version that meets the range', () => {
        expect(() => assertNodeVersion('>=24.11', 'v24.11.0')).not.toThrow();
    });

    it('passes a newer major even when its minor is lower', () => {
        expect(() => assertNodeVersion('>=24.11', 'v26.7.0')).not.toThrow();
    });

    it('checks nothing when the range is a form it cannot read', () => {
        expect(() => assertNodeVersion('', 'v22.18.0')).not.toThrow();
        expect(() => assertNodeVersion('^24.11.0', 'v22.18.0')).not.toThrow();
    });
});

describe('a host constructed on an unsupported node', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        TestHost.resetHost();
    });

    it('throws before the host reaches its own setup', () => {
        vi.stubEnv('PACKAGE_NODE_RANGE', '>=99.0');

        expect(() => new TestHost()).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.UnsupportedNodeVersion })
        );
    });

    it('constructs when the running version meets the range', () => {
        vi.stubEnv('PACKAGE_NODE_RANGE', '>=1.0');

        expect(() => new TestHost()).not.toThrow();
    });
});
