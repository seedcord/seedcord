import { describe, it, expect } from 'vitest';

import { Plugin } from '@src/plugin/Plugin';

import type { CoreBase } from '@interfaces/CoreBase';

interface TransportCore extends CoreBase {
    readonly extra: { readonly id: string };
}

// justified: the test only reads the members it declares
const host = { extra: { id: 'seed' } } as unknown as TransportCore;

class Bound extends Plugin<{}, TransportCore> {
    public init(): Promise<void> {
        return Promise.resolve();
    }
    // annotated to the bound type, which fails to compile when `core` stays CoreBase
    public peek(): TransportCore {
        return this.core;
    }
    public readExtra(): string {
        return this.core.extra.id;
    }
}

class Unbound extends Plugin {
    public init(): Promise<void> {
        return Promise.resolve();
    }
    public peek(): CoreBase {
        return this.core;
    }
    public reachTooFar(): unknown {
        // @ts-expect-error an unbound plugin reaches CoreBase only
        return this.core.extra;
    }
}

describe('the plugin base binds its core type', () => {
    it('returns the host the constructor received', () => {
        const plugin = new Bound(host);

        expect(plugin.peek()).toBe(host);
    });

    it('reads a transport member off the bound core', () => {
        const plugin = new Bound(host);

        expect(plugin.readExtra()).toBe('seed');
    });

    it('falls back to CoreBase with no binding', () => {
        const plugin = new Unbound(host);

        expect(plugin.peek()).toBe(host);
        // the type-level rejection is the `@ts-expect-error` inside reachTooFar
        expect(plugin.reachTooFar()).toBe(host.extra);
    });
});
