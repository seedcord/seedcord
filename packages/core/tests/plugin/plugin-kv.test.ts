import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vitest';

import { MemoryDriver } from '#src/kv/MemoryDriver';
import { Plugin } from '#src/plugin/Plugin';
import { TestPluginHost } from '#tests/utils/TestPluginHost';

import type { CoreBase } from '#interfaces/CoreBase';

class Notes extends Plugin {
    public init(): Promise<void> {
        return Promise.resolve();
    }

    public async save(id: string, text: string): Promise<void> {
        await this.kv.collection<string>('note').set(id, text);
    }
}

describe('a plugin kv', () => {
    it('keeps each attachment under its own attach key', async () => {
        const driver = new MemoryDriver();
        const host = new TestPluginHost('gateway', 'server', driver)
            .attach('a', Notes)
            .attach('b', Notes)
            .attach('group.c', Notes);

        await host.a.save('1', 'one');
        await host.b.save('1', 'two');
        await host.group.c.save('1', 'three');

        const entries = await Array.fromAsync(driver.entries('plugins:'));
        expect(entries.map(([key]) => key).toSorted()).toEqual([
            'plugins:a:note:1',
            'plugins:b:note:1',
            'plugins:group.c:note:1'
        ]);
    });

    it('throws when the constructor reads this.kv before attach() sets its key', () => {
        class Eager extends Plugin {
            constructor(core: CoreBase) {
                super(core);
                void this.kv;
            }
            public init(): Promise<void> {
                return Promise.resolve();
            }
        }

        expect(() => new TestPluginHost().attach('eager', Eager)).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CorePluginKvBeforeAttach })
        );
    });
});
