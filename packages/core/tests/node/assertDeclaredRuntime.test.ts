import { createRequire } from 'node:module';

import { SeedcordErrorCode } from '@seedcord/errors';
import { captureLogs } from '@seedcord/logger/internal';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { assertDeclaredRuntime } from '#node/assertDeclaredRuntime';
import { TestServerHost } from '#tests/utils/TestServerHost';

interface Runtime {
    nodeRange?: string;
    bunRange?: string;
    node?: string;
    bun?: string;
    deno?: string;
}

const realNode = Object.getOwnPropertyDescriptor(process.versions, 'node');

function setVersion(key: 'node' | 'bun' | 'deno', value: string): void {
    Object.defineProperty(process.versions, key, { value, configurable: true });
}

function onRuntime({ nodeRange = '>=24.11', bunRange = '>=1.4.2', node = '24.11.0', bun, deno }: Runtime): () => void {
    vi.stubEnv('PACKAGE_NODE_RANGE', nodeRange);
    vi.stubEnv('PACKAGE_BUN_RANGE', bunRange);
    setVersion('node', node);
    if (bun !== undefined) setVersion('bun', bun);
    if (deno !== undefined) setVersion('deno', deno);
    return () => assertDeclaredRuntime();
}

function expectUnsupported(run: () => void): void {
    expect(run).toThrow(expect.objectContaining({ code: SeedcordErrorCode.UnsupportedRuntimeVersion }));
}

afterEach(() => {
    vi.unstubAllEnvs();
    if (realNode) Object.defineProperty(process.versions, 'node', realNode);
    Reflect.deleteProperty(process.versions, 'bun');
    Reflect.deleteProperty(process.versions, 'deno');
    TestServerHost.resetHost();
});

describe('the runtime check on node', () => {
    it.each(['22.18.0', '24.10.0'])('rejects Node %s below the floor', (node) => {
        expectUnsupported(onRuntime({ node }));
    });

    it.each(['24.11.0', '24.22.0', '25.0.0', '26.5.1'])('accepts Node %s', (node) => {
        expect(onRuntime({ node })).not.toThrow();
    });

    it('reads a range with only a major', () => {
        expectUnsupported(onRuntime({ nodeRange: '>=24', node: '22.18.0' }));
        expect(onRuntime({ nodeRange: '>=24', node: '24.0.0' })).not.toThrow();
    });

    it('reads a range with a patch, and a range written with a space', () => {
        expectUnsupported(onRuntime({ nodeRange: '>=24.11.1', node: '24.11.0' }));
        expectUnsupported(onRuntime({ nodeRange: '>= 24.11', node: '22.18.0' }));
    });

    it("skips the check when it can't read the range", () => {
        expect(onRuntime({ nodeRange: '', node: '22.18.0' })).not.toThrow();
        expect(onRuntime({ nodeRange: 'not a range', node: '22.18.0' })).not.toThrow();
    });
});

describe('the runtime check on bun', () => {
    it('throws below the bun range even when the reported node version passes', () => {
        expectUnsupported(onRuntime({ bun: '1.4.1' }));
    });

    it('skips the node range since bun reports its own node version', () => {
        expect(onRuntime({ nodeRange: '>=99', bun: '1.4.2' })).not.toThrow();
    });

    it('tells the developer to upgrade bun', () => {
        expect(onRuntime({ bun: '1.4.1' })).toThrow(
            /requires Bun >=1\.4\.2, but this process runs 1\.4\.1\. Upgrade Bun/
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

describe('the runtime check on deno', () => {
    it('constructs a host with one warning that deno is untested, whatever node version it reports', () => {
        using logs = captureLogs();
        onRuntime({ nodeRange: '>=99', deno: '2.9.8' });

        expect(() => new TestServerHost()).not.toThrow();
        expect(logs.at('warn')).toEqual([expect.stringContaining("isn't tested on Deno")]);
    });
});

describe('the ranges this package declares', () => {
    const declared = createRequire(import.meta.url)('../../package.json') as {
        seedcord: { runtime: { node: string; bun: string } };
    };

    it('reject a far older node and bun', () => {
        expectUnsupported(onRuntime({ nodeRange: declared.seedcord.runtime.node, node: '1.0.0' }));
        expectUnsupported(onRuntime({ bunRange: declared.seedcord.runtime.bun, bun: '0.1.0' }));
    });
});

describe('a host constructed on an unsupported runtime', () => {
    it('throws on node before the host reaches its own setup', () => {
        onRuntime({ nodeRange: '>=99.0' });

        expectUnsupported(() => new TestServerHost());
    });

    it('throws on bun older than its own range, whatever node version it reports', () => {
        onRuntime({ nodeRange: '>=1.0', bun: '1.4.1' });

        expectUnsupported(() => new TestServerHost());
    });

    it('constructs when the running version meets the range', () => {
        onRuntime({ nodeRange: '>=1.0' });

        expect(() => new TestServerHost()).not.toThrow();
    });
});
