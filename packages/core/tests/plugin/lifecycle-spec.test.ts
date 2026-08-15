import { SeedcordError } from '@seedcord/errors/internal';
import { describe, expect, it } from 'vitest';

import { ShutdownPhase, StartupPhase } from '#src/lifecycle/phases';
import { Plugin, resolvedLifecycleSpecOf } from '#src/plugin/Plugin';

import type { CoreBase } from '#interfaces/CoreBase';
import type { PluginLifecycleSpec } from '#src/plugin/Plugin';

class SpecPlugin extends Plugin {
    // justified: never invoked, spec resolution is all these tests read
    public init(): Promise<void> {
        return Promise.resolve();
    }
    constructor(host: CoreBase, spec?: PluginLifecycleSpec) {
        super(host, spec);
    }
}

// justified: the base ctor only stores the host
const host = { config: {}, rateLimiter: {} } as unknown as CoreBase;

describe('plugin lifecycle spec', () => {
    it('resolves the base defaults', () => {
        const spec = resolvedLifecycleSpecOf(new SpecPlugin(host));
        expect(spec.init).toEqual({ phase: StartupPhase.Configuration, timeout: 15_000 });
        expect(spec.ready).toEqual({ timeout: 15_000 });
        expect(spec.dispose).toEqual({ phase: ShutdownPhase.Disconnect, timeout: 10_000 });
    });

    it('overrides only the fields the plugin declares', () => {
        const spec = resolvedLifecycleSpecOf(
            new SpecPlugin(host, {
                init: { phase: StartupPhase.Login, timeout: 5000 },
                dispose: { timeout: 2000 }
            })
        );
        expect(spec.init).toEqual({ phase: StartupPhase.Login, timeout: 5000 });
        expect(spec.dispose).toEqual({ phase: ShutdownPhase.Disconnect, timeout: 2000 });
    });

    it('keeps init and dispose defaults on a ready-only override', () => {
        const spec = resolvedLifecycleSpecOf(new SpecPlugin(host, { ready: { timeout: 5000 } }));
        expect(spec.init).toEqual({ phase: StartupPhase.Configuration, timeout: 15_000 });
        expect(spec.ready).toEqual({ timeout: 5000 });
        expect(spec.dispose).toEqual({ phase: ShutdownPhase.Disconnect, timeout: 10_000 });
    });

    it('throws on a non-positive declared timeout', () => {
        expect(() => new SpecPlugin(host, { init: { timeout: 0 } })).toThrow(SeedcordError);
        expect(() => new SpecPlugin(host, { init: { timeout: 0 } })).toThrow(/init\.timeout/);
        expect(() => new SpecPlugin(host, { ready: { timeout: -1 } })).toThrow(/ready\.timeout/);
        expect(() => new SpecPlugin(host, { ready: { timeout: 0 } })).toThrow(/ready\.timeout/);
        expect(() => new SpecPlugin(host, { dispose: { timeout: Number.NaN } })).toThrow(/dispose\.timeout/);
        expect(() => new SpecPlugin(host, { dispose: { timeout: 0 } })).toThrow(/dispose\.timeout/);
    });

    it('throws on an Infinity timeout', () => {
        expect(() => new SpecPlugin(host, { init: { timeout: Infinity } })).toThrow(/init\.timeout/);
    });
});
