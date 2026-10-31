import { describe, expect, vi } from 'vitest';

import { eventsOf } from '#bot/Bot';
import { Seedcord } from '#src/Seedcord';
import { seedcordPath } from '#tests/utils/source-path';
import { testConfig } from '#tests/utils/test-config';
import { it } from '#tests/utils/test-env';

import type { TestEnvironment } from '#tests/utils/test-env';
import type { SubscriptionData } from '@seedcord/core';

interface PrivateEventDispatcher {
    init(): Promise<void>;
    processEvent(eventName: string, args: unknown[]): Promise<void>;
}

// justified: processEvent is private on the dispatcher
function dispatcherOf(instance: Seedcord): PrivateEventDispatcher {
    return eventsOf(instance.bot) as unknown as PrivateEventDispatcher;
}

// A loads before B. A waits on the message before it finishes, B finishes right away
async function writeSlowAndFast(testEnv: TestEnvironment): Promise<void> {
    const handler = (name: string, arm: string): string => `
        import { EventHandler, RegisterEvent } from '${seedcordPath}';
        import { Events } from 'discord.js';

        @RegisterEvent(['messageCreate'])
        export class ${name} extends EventHandler<Events.MessageCreate> {
            public async execute() {
                await this.match({ messageCreate: (message) => ${arm} });
            }
        }
    `;
    await testEnv.createFile('events/A.ts', handler('A', 'message.wait()'));
    await testEnv.createFile('events/B.ts', handler('B', "message.mark('b')"));
}

describe('handlers for one event', () => {
    it('start a handler without waiting for the one loaded before it', async ({ testEnv }) => {
        await writeSlowAndFast(testEnv);
        await using seedcord = new Seedcord(testConfig({ events: testEnv.resolvePath('events') }));
        const events = dispatcherOf(seedcord);
        await events.init();

        const release = Promise.withResolvers<undefined>();
        const message = { wait: () => release.promise, mark: vi.fn() };
        const dispatching = events.processEvent('messageCreate', [message]);
        await vi.waitFor(() => expect(message.mark).toHaveBeenCalledWith('b'));

        release.resolve(undefined);
        await dispatching;
    });

    it('report their results in load order when they finish out of order', async ({ testEnv }) => {
        await writeSlowAndFast(testEnv);
        await using seedcord = new Seedcord(testConfig({ events: testEnv.resolvePath('events') }));
        const events = dispatcherOf(seedcord);
        await events.init();
        const reported: SubscriptionData<'eventDispatched'>[] = [];
        seedcord.bus.on('eventDispatched', (payload) => reported.push(payload));

        const release = Promise.withResolvers<undefined>();
        const message = { wait: () => release.promise, mark: vi.fn() };
        const dispatching = events.processEvent('messageCreate', [message]);
        setTimeout(() => release.resolve(undefined), 20);
        await dispatching;

        expect(reported[0]?.handlers.map((entry) => entry.handler)).toEqual(['A', 'B']);
    });
});
