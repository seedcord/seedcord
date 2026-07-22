import { SeedcordError } from '@seedcord/errors/internal';
import { Logger } from '@seedcord/logger';
import { describe, it, expect, expectTypeOf, afterEach } from 'vitest';

import { CoordinatedShutdown } from '@node/Lifecycle/CoordinatedShutdown';
import { CoordinatedStartup, StartupPhase } from '@node/Lifecycle/CoordinatedStartup';
import { Pluggable } from '@node/Pluggable';
import { Plugin } from '@src/plugin/Plugin';

import type { CoreBase } from '@interfaces/CoreBase';
import type { PluginArgs } from '@src/plugin/Plugin';

class TestPlugin extends Plugin {
    public logger = new Logger('TestPlugin');
    public initCalls = 0;

    constructor(
        core: CoreBase,
        public readonly tag: string
    ) {
        super(core);
    }

    public init(): Promise<void> {
        this.initCalls++;
        this.onInit?.();
        return Promise.resolve();
    }

    public onInit?: () => void;
}

class TestHost extends Pluggable {
    public run(): Promise<this> {
        return this.init();
    }

    public static resetHost(): void {
        Pluggable.reset();
    }
}

function makeHost(): { host: TestHost; startup: CoordinatedStartup } {
    const startup = new CoordinatedStartup();
    return { host: new TestHost(new CoordinatedShutdown(), startup), startup };
}

describe('Pluggable', () => {
    afterEach(() => {
        TestHost.resetHost();
    });

    it('attaches without a phase argument and threads ctor args', async () => {
        const { host, startup } = makeHost();

        const withDb = host.attach('db', TestPlugin, 'hello');

        expect(withDb.db).toBeInstanceOf(TestPlugin);
        expect(withDb.db.tag).toBe('hello');

        await host.run();
        expect(withDb.db.initCalls).toBe(1);
        expect(startup.isReady).toBe(true);
    });

    it('runs plugin init inside the Configuration phase', async () => {
        const { host, startup } = makeHost();
        const order: string[] = [];

        startup.on(`phase:${StartupPhase.Configuration}:start`, () => order.push('start'));
        startup.on(`phase:${StartupPhase.Configuration}:complete`, () => order.push('complete'));

        const withDb = host.attach('db', TestPlugin, 'x');
        withDb.db.onInit = () => order.push('init');

        await host.run();
        expect(order).toEqual(['start', 'init', 'complete']);
    });

    it('rejects a duplicate key', () => {
        const { host } = makeHost();
        host.attach('db', TestPlugin, 'one');
        expect(() => host.attach('db', TestPlugin, 'two')).toThrow(/db/);
    });

    it('rejects attach after init', async () => {
        const { host } = makeHost();
        await host.run();
        expect(() => host.attach('late', TestPlugin, 'x')).toThrow();
    });

    it('rejects a key colliding with a host property', () => {
        const { host } = makeHost();
        expect(() => host.attach('shutdown', TestPlugin, 'x')).toThrow(/shutdown/);
    });

    it('run is idempotent', async () => {
        const { host } = makeHost();
        const withDb = host.attach('db', TestPlugin, 'x');

        await host.run();
        await host.run();
        expect(withDb.db.initCalls).toBe(1);
    });

    it('infers the concrete ctor args at the attach call site', () => {
        expectTypeOf<PluginArgs<typeof TestPlugin>>().toEqualTypeOf<[tag: string]>();

        const { host } = makeHost();
        // @ts-expect-error the tag arg is a string, a number must not type-check
        expect(() => host.attach('db', TestPlugin, 42)).not.toThrow();
    });

    it('a second live host throws and releases its own handlers', () => {
        const base = process.listenerCount('SIGTERM');
        makeHost();

        expect(() => makeHost()).toThrow(SeedcordError);
        expect(process.listenerCount('SIGTERM')).toBe(base + 1);
    });

    it('reset allows a fresh host', () => {
        const base = process.listenerCount('SIGTERM');
        makeHost();

        TestHost.resetHost();
        expect(process.listenerCount('SIGTERM')).toBe(base);
        expect(() => makeHost()).not.toThrow();
    });
});
