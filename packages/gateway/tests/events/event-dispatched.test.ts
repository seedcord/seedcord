import { afterEach, describe, expect, vi } from 'vitest';

import { eventsOf } from '#bot/Bot';
import { Seedcord } from '#src/Seedcord';
import { seedcordPath } from '#tests/utils/source-path';
import { testConfig } from '#tests/utils/test-config';
import { it } from '#tests/utils/test-env';

import type { SubscriptionData } from '@seedcord/core';

import '#tests/utils/mock-env';

interface PrivateEventDispatcher {
    init(): Promise<void>;
    processEvent(eventName: string, args: unknown[]): Promise<void>;
}

// justified: processEvent is private on the dispatcher
function dispatcherOf(instance: Seedcord): PrivateEventDispatcher {
    return eventsOf(instance.bot) as unknown as PrivateEventDispatcher;
}

const EVENTS_DIR = 'events';
const MIDDLEWARES_DIR = 'event-mw';

const OK = `
    import { EventHandler, RegisterEvent } from '${seedcordPath}';
    import { Events } from 'discord.js';

    @RegisterEvent(['messageCreate'])
    export class Ok extends EventHandler<Events.MessageCreate> {
        public async execute() {
            await Promise.resolve();
        }
    }
`;

const BOOM = `
    import { EventHandler, RegisterEvent } from '${seedcordPath}';
    import { Events } from 'discord.js';

    @RegisterEvent(['messageCreate'])
    export class Boom extends EventHandler<Events.MessageCreate> {
        public async execute() {
            await Promise.resolve();
            throw new Error('handler exploded');
        }
    }
`;

const ONCE = `
    import { EventHandler, RegisterEvent } from '${seedcordPath}';
    import { Events } from 'discord.js';

    @RegisterEvent(['messageCreate', { frequency: 'once' }])
    export class Spent extends EventHandler<Events.MessageCreate> {
        public async execute() {
            await Promise.resolve();
        }
    }
`;

const STOPS = `
    import { RegisterEventMiddleware, EventMiddleware, Silence } from '${seedcordPath}';

    @RegisterEventMiddleware()
    export class Stops extends EventMiddleware {
        public async execute() {
            await Promise.resolve();
            throw new Silence('dropped');
        }
    }
`;

type FireMessageCreate = (middlewares?: string) => Promise<SubscriptionData<'eventDispatched'>[]>;

const withFire = it.extend<{ fireMessageCreate: FireMessageCreate }>({
    fireMessageCreate: async ({ testEnv, seedcordWith }, use) => {
        await use(async (middlewares) => {
            const seedcord = seedcordWith(
                testConfig({
                    events: testEnv.resolvePath(EVENTS_DIR),
                    ...(middlewares && { eventMiddlewares: testEnv.resolvePath(middlewares) })
                })
            );
            const events = dispatcherOf(seedcord);
            await events.init();

            const published: SubscriptionData<'eventDispatched'>[] = [];
            seedcord.bus.on('eventDispatched', (payload) => published.push(payload));

            await events.processEvent('messageCreate', [{ reply: vi.fn() }]);
            return published;
        });
    }
});

describe('eventDispatched', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    withFire(
        'publishes once per fire, naming every handler that ran and how it ended',
        async ({ testEnv, fireMessageCreate }) => {
            await testEnv.createFile(`${EVENTS_DIR}/Ok.ts`, OK);
            await testEnv.createFile(`${EVENTS_DIR}/Boom.ts`, BOOM);

            const published = await fireMessageCreate();

            expect(published).toHaveLength(1);
            expect(published[0]?.name).toBe('messageCreate');
            expect(published[0]?.outcome).toBe('handled');
            expect(published[0]?.handlers.map((entry) => `${entry.handler}:${entry.outcome}`).toSorted()).toEqual([
                'Boom:failed',
                'Ok:handled'
            ]);
        }
    );

    withFire('reports a refusal from the middleware chain with no handlers', async ({ testEnv, fireMessageCreate }) => {
        await testEnv.createFile(`${EVENTS_DIR}/Ok.ts`, OK);
        await testEnv.createFile(`${MIDDLEWARES_DIR}/Stops.ts`, STOPS);

        const published = await fireMessageCreate(MIDDLEWARES_DIR);

        expect(published).toHaveLength(1);
        expect(published[0]?.outcome).toBe('refused');
        expect(published[0]?.handlers).toEqual([]);
    });

    it('pairs with eventDispatching once a spent once-handler leaves nothing to run', async ({ testEnv }) => {
        await testEnv.createFile(`${EVENTS_DIR}/Once.ts`, ONCE);

        await using seedcord = new Seedcord(testConfig({ events: testEnv.resolvePath(EVENTS_DIR) }));
        const events = dispatcherOf(seedcord);
        const onSpy = vi.spyOn(seedcord.bot.client, 'on');
        await events.init();

        const starts: unknown[] = [];
        const ends: unknown[] = [];
        seedcord.bus.on('eventDispatching', (payload) => starts.push(payload));
        seedcord.bus.on('eventDispatched', (payload) => ends.push(payload));

        const fire = onSpy.mock.calls.find(([event]) => event === 'messageCreate')?.[1] as
            ((...args: unknown[]) => void) | undefined;
        expect(fire).toBeDefined();

        fire?.({ reply: vi.fn() });
        await vi.waitFor(() => expect(ends).toHaveLength(1));

        fire?.({ reply: vi.fn() });
        await vi.waitFor(() => expect(starts.length).toBeGreaterThan(0));

        expect(ends).toHaveLength(1);
        expect(starts).toHaveLength(1);
    });

    it('stamps the same dispatchId on both keys for one fire', async ({ testEnv }) => {
        await testEnv.createFile(`${EVENTS_DIR}/Ok.ts`, OK);

        await using seedcord = new Seedcord(testConfig({ events: testEnv.resolvePath(EVENTS_DIR) }));
        const events = dispatcherOf(seedcord);
        await events.init();

        const starts: SubscriptionData<'eventDispatching'>[] = [];
        const ends: SubscriptionData<'eventDispatched'>[] = [];
        seedcord.bus.on('eventDispatching', (payload) => starts.push(payload));
        seedcord.bus.on('eventDispatched', (payload) => ends.push(payload));

        await events.processEvent('messageCreate', [{ reply: vi.fn() }]);

        expect(starts[0]?.dispatchId).toEqual(expect.any(String));
        expect(ends[0]?.dispatchId).toBe(starts[0]?.dispatchId);
    });

    it('stays quiet for an event no handler registered', async ({ testEnv }) => {
        await testEnv.createFile(`${EVENTS_DIR}/Ok.ts`, OK);

        await using seedcord = new Seedcord(testConfig({ events: testEnv.resolvePath(EVENTS_DIR) }));
        const events = dispatcherOf(seedcord);
        await events.init();

        const published: SubscriptionData<'eventDispatched'>[] = [];
        seedcord.bus.on('eventDispatched', (payload) => published.push(payload));

        await events.processEvent('guildCreate', [{}]);

        expect(published).toEqual([]);
    });
});
