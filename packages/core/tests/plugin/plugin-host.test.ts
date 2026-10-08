import { SeedcordErrorCode } from '@seedcord/errors';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Plugin } from '#src/plugin/Plugin';
import { TestPluginHost } from '#tests/utils/TestPluginHost';

import type { CoreBase } from '#interfaces/CoreBase';

class Counter extends Plugin {
    public init(): Promise<void> {
        return Promise.resolve();
    }

    public reachCore(): CoreBase {
        return this.core;
    }
}

describe('PluginHost', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('lets two hosts live in one process', () => {
        const first = new TestPluginHost().attach('counter', Counter);
        const second = new TestPluginHost().attach('counter', Counter);

        expect(first.counter).not.toBe(second.counter);
    });

    it('skips the node version check so a host outside node can construct', () => {
        vi.stubEnv('PACKAGE_NODE_RANGE', '>=999');

        expect(() => new TestPluginHost()).not.toThrow();
    });

    it('rejects a duplicate key', () => {
        const host = new TestPluginHost();
        host.attach('db', Counter);

        expect(() => host.attach('db', Counter)).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CorePluginKeyExists })
        );
    });

    it('rejects a key colliding with a host member', () => {
        const host = new TestPluginHost();
        // a javascript caller skips the compile check and reaches this runtime guard
        const attachRaw = host.attach.bind(host) as (key: string, plugin: typeof Counter) => unknown;

        expect(() => attachRaw('bus', Counter)).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CorePluginKeyExists })
        );
    });

    it('attaches under a key that type-checks even when the host keeps a field of that name', () => {
        const host = new TestPluginHost().attach('groups', Counter);

        expect(host.groups).toBeInstanceOf(Counter);
    });

    describe('core access', () => {
        it('hands the attaching host to the plugin', () => {
            const host = new TestPluginHost();

            expect(host.attach('db', Counter).db.reachCore()).toBe(host);
        });

        it('rejects a plugin built on another copy of @seedcord/core before constructing it', async () => {
            vi.resetModules();
            const { Plugin: OtherCopy } = await import('#src/plugin/Plugin');

            const constructed = vi.fn(() => true);
            class FromOtherCore extends OtherCopy {
                public readonly built = constructed();

                public init(): Promise<void> {
                    return Promise.resolve();
                }
            }

            expect(() => new TestPluginHost().attach('kv', FromOtherCore)).toThrow(
                expect.objectContaining({ code: SeedcordErrorCode.CorePluginFromOtherCore })
            );
            expect(constructed).not.toHaveBeenCalled();
        });
    });
});
