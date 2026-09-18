import { REST } from '@discordjs/rest';
import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { MemoryRateLimiter } from '@seedcord/rate-limiter';
import { describe, it, expect, afterEach } from 'vitest';

import { CoordinatedShutdown } from '#node/Lifecycle/CoordinatedShutdown';
import { CoordinatedStartup } from '#node/Lifecycle/CoordinatedStartup';
import { Pluggable } from '#node/Pluggable';
import { Plugin } from '#src/plugin/Plugin';
import { Bus } from '#subscribers/Bus';

import type { CoreBase } from '#interfaces/CoreBase';
import type { Config, IRateLimiter } from '@seedcord/types';

class TestPlugin extends Plugin {
    public initCalls = 0;

    constructor(
        core: CoreBase,
        public readonly tag: string
    ) {
        super(core);
    }

    public init(): Promise<void> {
        this.initCalls++;
        return Promise.resolve();
    }
}

class TestHost extends Pluggable<'gateway', 'server'> {
    public readonly config = {} as Config;
    public readonly rest = new REST();
    public readonly applicationId = 'app-1';
    public readonly rateLimiter: IRateLimiter = new MemoryRateLimiter();
    public readonly bus: Bus;

    constructor(shutdown: CoordinatedShutdown, startup: CoordinatedStartup) {
        super(shutdown, startup);
        this.bus = new Bus(this);
    }

    public run(): Promise<this> {
        return this.init();
    }

    public static resetHost(): void {
        Pluggable.reset();
    }
}

function makeHost(): TestHost {
    return new TestHost(new CoordinatedShutdown(), new CoordinatedStartup());
}

describe('Pluggable.attach with a grouped key', () => {
    afterEach(() => {
        TestHost.resetHost();
    });

    it('puts the plugin under the group on the host', () => {
        const host = makeHost();

        const bot = host.attach('services.users', TestPlugin, 'ada');

        expect(bot.services.users).toBeInstanceOf(TestPlugin);
        expect(bot.services.users.tag).toBe('ada');
    });

    it('keeps both plugins when two attach into one group', () => {
        const host = makeHost();

        const bot = host.attach('services.users', TestPlugin, 'ada').attach('services.tickets', TestPlugin, 'open');

        expect(bot.services.users.tag).toBe('ada');
        expect(bot.services.tickets.tag).toBe('open');
    });

    it('refuses to nest under a key that already holds a plugin', () => {
        const host = makeHost();
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
        const host = makeHost();
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
        const host = makeHost();

        const bot = host.attach('services.users', TestPlugin, 'ada').attach('services.valueOf', TestPlugin, 'grace');

        expect(bot.services.valueOf.tag).toBe('grace');
        expect(Object.keys(bot.services)).toEqual(['users', 'valueOf']);
    });

    it('stores a leaf called __proto__ as a key of the group', () => {
        const host = makeHost();

        const bot = host.attach('services.__proto__', TestPlugin, 'ada');

        expect(Object.keys(bot.services)).toEqual(['__proto__']);
    });

    it('refuses a malformed key, saying which part is wrong', () => {
        const host = makeHost();
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
        const host = makeHost();
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

    it('runs init for a grouped plugin like any other', async () => {
        const host = makeHost();
        const bot = host.attach('services.users', TestPlugin, 'ada');

        await host.run();

        expect(bot.services.users.initCalls).toBe(1);
    });
});
