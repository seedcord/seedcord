import { createRequire } from 'node:module';

import { REST } from '@discordjs/rest';
import { SeedcordErrorCode } from '@seedcord/errors';
import { MemoryRateLimiter } from '@seedcord/rate-limiter';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { assertDeclaredRuntime } from '#node/assertRuntimeVersion';
import { CoordinatedShutdown } from '#node/Lifecycle/CoordinatedShutdown';
import { ServerHost } from '#node/ServerHost';
import { CoordinatedStartup } from '#src/lifecycle/CoordinatedStartup';
import { Bus } from '#subscribers/Bus';

import type { Config, IRateLimiter } from '@seedcord/types';

class TestHost extends ServerHost<'gateway'> {
    public readonly config = {} as Config;
    public readonly rest = new REST();
    public readonly applicationId = 'app-1';
    public readonly rateLimiter: IRateLimiter = new MemoryRateLimiter();
    public readonly bus: Bus;

    constructor() {
        super('gateway', new CoordinatedShutdown(), new CoordinatedStartup());
        this.bus = new Bus(this);
    }

    public static resetHost(): void {
        ServerHost.reset();
    }
}

interface Runtime {
    nodeRange?: string;
    bunRange?: string;
    node?: string;
    bun?: string;
}

const realNode = Object.getOwnPropertyDescriptor(process.versions, 'node');

function setVersion(key: 'node' | 'bun', value: string): void {
    Object.defineProperty(process.versions, key, { value, configurable: true });
}

function onRuntime({ nodeRange = '>=24.11', bunRange = '>=1.4.2', node = '26.3.0', bun }: Runtime): () => void {
    vi.stubEnv('PACKAGE_NODE_RANGE', nodeRange);
    vi.stubEnv('PACKAGE_BUN_RANGE', bunRange);
    setVersion('node', node);
    if (bun !== undefined) setVersion('bun', bun);
    return () => assertDeclaredRuntime();
}

function expectUnsupported(run: () => void): void {
    expect(run).toThrow(expect.objectContaining({ code: SeedcordErrorCode.UnsupportedRuntimeVersion }));
}

afterEach(() => {
    vi.unstubAllEnvs();
    if (realNode) Object.defineProperty(process.versions, 'node', realNode);
    Reflect.deleteProperty(process.versions, 'bun');
    TestHost.resetHost();
});

describe('the runtime check on node', () => {
    it('throws when the running version is below the declared range', () => {
        expectUnsupported(onRuntime({ node: '22.18.0' }));
    });

    it('passes a version that meets the range', () => {
        expect(onRuntime({ node: '24.11.0' })).not.toThrow();
    });

    it('passes a newer major even when its minor is lower', () => {
        expect(onRuntime({ node: '26.7.0' })).not.toThrow();
    });

    it('reads a range that names only a major', () => {
        expectUnsupported(onRuntime({ nodeRange: '>=24', node: '22.18.0' }));
        expect(onRuntime({ nodeRange: '>=24', node: '24.0.0' })).not.toThrow();
    });

    it('reads a range that names a patch, and a range written with a space', () => {
        expectUnsupported(onRuntime({ nodeRange: '>=24.11.1', node: '24.11.0' }));
        expectUnsupported(onRuntime({ nodeRange: '>= 24.11', node: '22.18.0' }));
    });

    it('checks nothing when the range is a form it cannot read', () => {
        expect(onRuntime({ nodeRange: '', node: '22.18.0' })).not.toThrow();
        expect(onRuntime({ nodeRange: '^24.11.0', node: '22.18.0' })).not.toThrow();
    });
});

describe('the runtime check on bun', () => {
    it('throws below the bun range even when the reported node version passes', () => {
        expectUnsupported(onRuntime({ bun: '1.4.1' }));
    });

    it('skips the node range, since bun reports its own node version', () => {
        expect(onRuntime({ nodeRange: '>=99', bun: '1.4.2' })).not.toThrow();
    });

    it('tells the developer to upgrade bun', () => {
        expect(onRuntime({ bun: '1.4.1' })).toThrow(
            /requires Bun >=1\.4\.2 but this process runs 1\.4\.1\. Upgrade Bun/
        );
    });

    it('ranks a prerelease below the release it leads up to', () => {
        expectUnsupported(onRuntime({ bun: '1.3.9-canary.1' }));
        expectUnsupported(onRuntime({ bun: '1.4.2-canary.1' }));
        expectUnsupported(onRuntime({ nodeRange: '>=24', node: '24.0.0-rc.1' }));
        expect(onRuntime({ bun: '1.4.3-canary.1' })).not.toThrow();
    });

    it('passes a version that meets the range', () => {
        expect(onRuntime({ bun: '1.4.2' })).not.toThrow();
        expect(onRuntime({ bun: '1.4.10' })).not.toThrow();
    });
});

describe('the ranges this package declares', () => {
    const declared = createRequire(import.meta.url)('../../package.json') as {
        engines: { node: string; bun: string };
    };

    it('reject a far older node and bun', () => {
        expectUnsupported(onRuntime({ nodeRange: declared.engines.node, node: '1.0.0' }));
        expectUnsupported(onRuntime({ bunRange: declared.engines.bun, bun: '0.1.0' }));
    });
});

describe('a host constructed on an unsupported runtime', () => {
    it('throws on node before the host reaches its own setup', () => {
        onRuntime({ nodeRange: '>=99.0' });

        expectUnsupported(() => new TestHost());
    });

    it('throws on bun older than its own range, whatever node version it reports', () => {
        onRuntime({ nodeRange: '>=1.0', bun: '1.4.1' });

        expectUnsupported(() => new TestHost());
    });

    it('constructs when the running version meets the range', () => {
        onRuntime({ nodeRange: '>=1.0' });

        expect(() => new TestHost()).not.toThrow();
    });
});
