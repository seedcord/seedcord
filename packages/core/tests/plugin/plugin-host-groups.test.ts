import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { describe, it, expect } from 'vitest';

import { Plugin } from '#src/plugin/Plugin';
import { TestPluginHost } from '#tests/utils/TestPluginHost';

import type { CoreBase } from '#interfaces/CoreBase';

class TestPlugin extends Plugin {
    constructor(
        core: CoreBase,
        public readonly tag: string
    ) {
        super(core);
    }

    public init(): Promise<void> {
        return Promise.resolve();
    }
}

describe('PluginHost.attach with a grouped key', () => {
    it('puts the plugin under the group on the host', () => {
        const host = new TestPluginHost();

        const bot = host.attach('services.users', TestPlugin, 'ada');

        expect(bot.services.users).toBeInstanceOf(TestPlugin);
        expect(bot.services.users.tag).toBe('ada');
    });

    it('keeps both plugins when two attach into one group', () => {
        const host = new TestPluginHost();

        const bot = host.attach('services.users', TestPlugin, 'ada').attach('services.tickets', TestPlugin, 'open');

        expect(bot.services.users.tag).toBe('ada');
        expect(bot.services.tickets.tag).toBe('open');
    });

    it('refuses to nest under a key that already holds a plugin', () => {
        const host = new TestPluginHost();
        const bot = host.attach('db', TestPlugin, 'x');
        // bypasses the assert to hit the runtime guard a javascript caller still reaches
        const attachRaw = bot.attach.bind(bot) as (key: string, plugin: typeof TestPlugin, tag: string) => unknown;

        let caught: unknown;
        try {
            attachRaw('db.pool', TestPlugin, 'y');
        } catch (error) {
            caught = error;
        }

        expect(isSeedcordError(caught, undefined, SeedcordErrorCode.CorePluginGroupTaken)).toBe(true);
    });

    it('refuses to attach a plugin at a name that holds a group', () => {
        const host = new TestPluginHost();
        const bot = host.attach('services.users', TestPlugin, 'ada');
        const attachRaw = bot.attach.bind(bot) as (key: string, plugin: typeof TestPlugin, tag: string) => unknown;

        let caught: unknown;
        try {
            attachRaw('services', TestPlugin, 'y');
        } catch (error) {
            caught = error;
        }

        expect(isSeedcordError(caught, undefined, SeedcordErrorCode.CorePluginKeyHoldsGroup)).toBe(true);
    });

    it('attaches a leaf whose name matches an Object.prototype member', () => {
        const host = new TestPluginHost();

        const bot = host.attach('services.users', TestPlugin, 'ada').attach('services.valueOf', TestPlugin, 'grace');

        expect(bot.services.valueOf.tag).toBe('grace');
        expect(Object.keys(bot.services)).toEqual(['users', 'valueOf']);
    });

    it('stores a leaf called __proto__ as a key of the group', () => {
        const host = new TestPluginHost();

        const bot = host.attach('services.__proto__', TestPlugin, 'ada');

        expect(Object.keys(bot.services)).toEqual(['__proto__']);
    });

    it('refuses a malformed key, saying which part is wrong', () => {
        const host = new TestPluginHost();
        const attachRaw = host.attach.bind(host) as (key: string, plugin: typeof TestPlugin, tag: string) => unknown;

        const caughtFor = (key: string): unknown => {
            try {
                attachRaw(key, TestPlugin, 'x');
            } catch (error) {
                return error;
            }
            return null;
        };

        for (const key of ['services.users.admin', 'services.', '.users']) {
            expect(isSeedcordError(caughtFor(key), undefined, SeedcordErrorCode.CorePluginKeyMalformed)).toBe(true);
        }

        expect(String(caughtFor('services.users.admin')).includes('more than one dot')).toBe(true);
        expect(String(caughtFor('services.')).includes('empty part')).toBe(true);
    });

    it('refuses a second plugin on a leaf that is already attached', () => {
        const host = new TestPluginHost();
        const bot = host.attach('services.users', TestPlugin, 'ada');
        const attachRaw = bot.attach.bind(bot) as (key: string, plugin: typeof TestPlugin, tag: string) => unknown;

        let caught: unknown;
        try {
            attachRaw('services.users', TestPlugin, 'grace');
        } catch (error) {
            caught = error;
        }

        expect(isSeedcordError(caught, undefined, SeedcordErrorCode.CorePluginKeyExists)).toBe(true);
    });
});
