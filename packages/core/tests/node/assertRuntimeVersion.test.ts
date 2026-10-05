import { createRequire } from 'node:module';

import { REST } from '@discordjs/rest';
import { SeedcordErrorCode } from '@seedcord/errors';
import { MemoryRateLimiter } from '@seedcord/rate-limiter';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { assertRuntimeVersion } from '#node/assertRuntimeVersion';
import { CoordinatedShutdown } from '#node/Lifecycle/CoordinatedShutdown';
import { CoordinatedStartup } from '#node/Lifecycle/CoordinatedStartup';
import { Pluggable } from '#node/Pluggable';
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

function expectUnsupported(run: () => void): void {
    expect(run).toThrow(expect.objectContaining({ code: SeedcordErrorCode.UnsupportedRuntimeVersion }));
}

function onNode(range: string, node: string): () => void {
    return () => assertRuntimeVersion({ node: range, bun: '>=1.4.2' }, { node });
}

function onBun(range: string, bun: string): () => void {
    // bun 1.4.2 reports node 26.3.0
    return () => assertRuntimeVersion({ node: '>=24.11', bun: range }, { node: '26.3.0', bun });
}

describe('assertRuntimeVersion on node', () => {
    it('throws when the running version is below the declared range', () => {
        expectUnsupported(onNode('>=24.11', '22.18.0'));
    });

    it('passes a version that meets the range', () => {
        expect(onNode('>=24.11', '24.11.0')).not.toThrow();
    });

    it('passes a newer major even when its minor is lower', () => {
        expect(onNode('>=24.11', '26.7.0')).not.toThrow();
    });

    it('reads a range that names only a major', () => {
        expectUnsupported(onNode('>=24', '22.18.0'));
        expect(onNode('>=24', '24.0.0')).not.toThrow();
    });

    it('reads a range that names a patch, and a range written with a space', () => {
        expectUnsupported(onNode('>=24.11.1', '24.11.0'));
        expectUnsupported(onNode('>= 24.11', '22.18.0'));
    });

    it('checks nothing when the range is a form it cannot read', () => {
        expect(onNode('', '22.18.0')).not.toThrow();
        expect(onNode('^24.11.0', '22.18.0')).not.toThrow();
    });
});

describe('assertRuntimeVersion on bun', () => {
    it('throws below the bun range even when the reported node version passes', () => {
        expectUnsupported(onBun('>=1.4.2', '1.4.1'));
    });

    it('tells the developer to upgrade bun', () => {
        expect(onBun('>=1.4.2', '1.4.1')).toThrow(/requires Bun >=1\.4\.2 but this process runs 1\.4\.1\. Upgrade Bun/);
    });

    it('compares the release numbers of a prerelease build', () => {
        expectUnsupported(onBun('>=1.4.2', '1.3.9-canary.1'));
        expect(onBun('>=1.4.2', '1.4.3-canary.1')).not.toThrow();
    });

    it('passes a version that meets the range', () => {
        expect(onBun('>=1.4.2', '1.4.2')).not.toThrow();
        expect(onBun('>=1.4.2', '1.4.10')).not.toThrow();
    });
});

describe('the ranges this package declares', () => {
    const declared = createRequire(import.meta.url)('../../package.json') as {
        engines: { node: string; bun: string };
    };

    it('reject a far older node and bun', () => {
        expectUnsupported(onNode(declared.engines.node, '1.0.0'));
        expectUnsupported(onBun(declared.engines.bun, '0.1.0'));
    });
});

describe('a host constructed on an unsupported node', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        TestHost.resetHost();
    });

    it('throws before the host reaches its own setup', () => {
        vi.stubEnv('PACKAGE_NODE_RANGE', '>=99.0');

        expectUnsupported(() => new TestHost());
    });

    it('constructs when the running version meets the range', () => {
        vi.stubEnv('PACKAGE_NODE_RANGE', '>=1.0');

        expect(() => new TestHost()).not.toThrow();
    });
});

describe('a host constructed on an unsupported bun', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        Reflect.deleteProperty(process.versions, 'bun');
        TestHost.resetHost();
    });

    it('throws when bun is older than its own range, whatever node version it reports', () => {
        vi.stubEnv('PACKAGE_NODE_RANGE', '>=1.0');
        vi.stubEnv('PACKAGE_BUN_RANGE', '>=1.4.2');
        Object.defineProperty(process.versions, 'bun', { value: '1.4.1', configurable: true });

        expectUnsupported(() => new TestHost());
    });
});
