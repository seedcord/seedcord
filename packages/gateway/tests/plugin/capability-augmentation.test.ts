import { Plugin } from '@seedcord/core/plugin';
import { describe, expectTypeOf, it } from 'vitest';

import type { REST } from '@discordjs/rest';
import type { PluginContext } from '@seedcord/core/plugin';
import type { Client } from 'discord.js';

// probes that src/plugin-capabilities `declare module '@seedcord/core'` reaches PluginContext
class NeedsClientRest extends Plugin<{ needs: 'client' | 'rest' }> {
    // justified: type-probe fixture, never invoked
    public init(): Promise<void> {
        return Promise.resolve();
    }
    public peek(): PluginContext<'client' | 'rest'> {
        return this.ctx;
    }
}

describe('gateway plugin capability augmentation', () => {
    it('resolves client and rest to the gateway types', () => {
        expectTypeOf<ReturnType<NeedsClientRest['peek']>['client']>().toEqualTypeOf<Client>();
        expectTypeOf<ReturnType<NeedsClientRest['peek']>['rest']>().toEqualTypeOf<REST>();
    });
});
