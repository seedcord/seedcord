import { describe, expectTypeOf, it } from 'vitest';

import { Plugin } from '@src/plugin/Plugin';

import type { Logger } from '@seedcord/logger';
import type { Config, Store } from '@seedcord/types';
import type { PluginContext } from '@src/plugin/Plugin';

// core leaves the transport arms unknown, so these probe declared-vs-never membership
class Bare extends Plugin {
    // justified: never invoked, these fixtures exist for type probes only
    public logger = null as unknown as Logger;
    public init(): Promise<void> {
        return Promise.resolve();
    }
    public peek(): PluginContext<never> {
        return this.ctx;
    }
}

class NeedsToken extends Plugin<{ needs: 'token' }> {
    // justified: never invoked, these fixtures exist for type probes only
    public logger = null as unknown as Logger;
    public init(): Promise<void> {
        return Promise.resolve();
    }
    public peek(): PluginContext<'token'> {
        return this.ctx;
    }
}

class NeedsTokenRest extends Plugin<{ needs: 'token' | 'rest' }> {
    // justified: never invoked, these fixtures exist for type probes only
    public logger = null as unknown as Logger;
    public init(): Promise<void> {
        return Promise.resolve();
    }
    public peek(): PluginContext<'token' | 'rest'> {
        return this.ctx;
    }
}

describe('plugin ctx typing', () => {
    it('always exposes logger, config, store', () => {
        expectTypeOf<PluginContext<never>['logger']>().toEqualTypeOf<Logger>();
        expectTypeOf<PluginContext<never>['config']>().toEqualTypeOf<Config>();
        expectTypeOf<PluginContext<never>['store']>().toEqualTypeOf<Store<'charge'>>();
    });

    it('types an undeclared capability as never', () => {
        expectTypeOf<PluginContext<never>['token']>().toEqualTypeOf<never>();
    });

    it('types a declared capability as its value', () => {
        expectTypeOf<PluginContext<'token'>['token']>().toEqualTypeOf<string>();
    });

    it('keeps bare and declared shapes distinct', () => {
        expectTypeOf<ReturnType<Bare['peek']>['token']>().toEqualTypeOf<never>();
        expectTypeOf<ReturnType<NeedsToken['peek']>['token']>().toEqualTypeOf<string>();
    });

    it('resolves a two-member needs union per key', () => {
        expectTypeOf<ReturnType<NeedsTokenRest['peek']>['token']>().toEqualTypeOf<string>();
        expectTypeOf<ReturnType<NeedsTokenRest['peek']>['rest']>().toEqualTypeOf<unknown>();
        expectTypeOf<ReturnType<NeedsTokenRest['peek']>['client']>().toEqualTypeOf<never>();
    });
});
