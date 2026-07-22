import { CoordinatedShutdown, CoordinatedStartup } from '@seedcord/core/node';
import { Logger } from '@seedcord/logger';
import { describe, it, expect } from 'vitest';

import { Plugin, Pluggable } from '@interfaces/Plugin';

import type { Core } from '@interfaces/Core';

class TestPlugin extends Plugin {
    public logger = new Logger('TestPlugin');
    public initCalls = 0;

    constructor(
        core: Core,
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
}

function makeHost(): { host: TestHost; startup: CoordinatedStartup } {
    const startup = new CoordinatedStartup();
    const host = new TestHost(new CoordinatedShutdown(false), startup);
    return { host, startup };
}

describe('Pluggable.attach', () => {
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

        startup.on('phase:4:start', () => order.push('4:start'));
        startup.on('phase:4:complete', () => order.push('4:complete'));

        const withDb = host.attach('db', TestPlugin, 'x');
        withDb.db.onInit = () => order.push('init');

        await host.run();
        expect(order).toEqual(['4:start', 'init', '4:complete']);
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
});
