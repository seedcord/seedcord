import { HostPluginKeys } from '@seedcord/types/internal';
import { describe, it, expect } from 'vitest';

import { Plugin } from '#src/plugin/Plugin';
import { TestPluginHost } from '#tests/utils/TestPluginHost';

class TestPlugin extends Plugin {
    public init(): Promise<void> {
        return Promise.resolve();
    }
}

describe('pluginKeys', () => {
    it('is empty before anything attaches', () => {
        expect(new TestPluginHost()[HostPluginKeys]).toEqual([]);
    });

    it('reports the keys in attach order', () => {
        const host = new TestPluginHost();

        const attached = host.attach('db', TestPlugin).attach('cache', TestPlugin);

        expect(attached[HostPluginKeys]).toEqual(['db', 'cache']);
    });

    it('reports a grouped key whole', () => {
        const host = new TestPluginHost();

        const attached = host.attach('services.users', TestPlugin);

        expect(attached[HostPluginKeys]).toEqual(['services.users']);
    });
});
