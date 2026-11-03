import { describe, expect, vi } from 'vite-plus/test';

import { Seedcord } from '#src/Seedcord';
import { dispatcherOf } from '#tests/utils/dispatcherOf';
import { seedcordPath } from '#tests/utils/source-path';
import { testConfig } from '#tests/utils/test-config';
import { it } from '#tests/utils/test-env';

import type { TestEnvironment } from '#tests/utils/test-env';
import type { SubscriptionData } from '@seedcord/core';

// A loads before B
async function writeHandlers(testEnv: TestEnvironment, bodyA: string, bodyB: string): Promise<void> {
    const handler = (name: string, body: string): string => `
        import { EventHandler, Fault, RegisterEvent } from '${seedcordPath}';
        import { Events } from 'discord.js';

        @RegisterEvent(['messageCreate'])
        export class ${name} extends EventHandler<Events.MessageCreate> {
            public async execute() {
                await this.match({ messageCreate: (message) => ${body} });
            }
        }
    `;
    await testEnv.createFile('events/A.ts', handler('A', bodyA));
    await testEnv.createFile('events/B.ts', handler('B', bodyB));
}

async function bootWithReports(testEnv: TestEnvironment): Promise<{
    seedcord: Seedcord;
    events: ReturnType<typeof dispatcherOf>;
    reported: SubscriptionData<'eventDispatched'>[];
}> {
    const seedcord = new Seedcord(testConfig({ events: testEnv.resolvePath('events') }));
    const events = dispatcherOf(seedcord);
    await events.init();
    const reported: SubscriptionData<'eventDispatched'>[] = [];
    seedcord.bus.on('eventDispatched', (payload) => reported.push(payload));
    return { seedcord, events, reported };
}

describe('handlers for one event', () => {
    it('start together and report in load order when they finish out of order', async ({ testEnv }) => {
        await writeHandlers(testEnv, 'message.wait()', "message.mark('b')");
        const { seedcord, events, reported } = await bootWithReports(testEnv);
        await using _seedcord = seedcord;

        const release = Promise.withResolvers<undefined>();
        const message = { wait: () => release.promise, mark: vi.fn() };
        const dispatching = events.processEvent('messageCreate', [message]);
        await vi.waitFor(() => expect(message.mark).toHaveBeenCalledWith('b'));
        release.resolve(undefined);
        await dispatching;

        expect(reported[0]?.handlers.map((entry) => entry.handler)).toEqual(['A', 'B']);
    });

    it('keep their own results when one fails while another is still running', async ({ testEnv }) => {
        await writeHandlers(testEnv, 'Promise.reject(new Fault())', 'message.wait()');
        const { seedcord, events, reported } = await bootWithReports(testEnv);
        await using _seedcord = seedcord;
        const faults: string[] = [];
        seedcord.bus.on('handledException', ({ origin }) => faults.push(origin));

        const release = Promise.withResolvers<undefined>();
        const message = { wait: () => release.promise };
        const dispatching = events.processEvent('messageCreate', [message]);
        await vi.waitFor(() => expect(faults).toEqual(['event:messageCreate:A']));
        expect(reported).toHaveLength(0);
        release.resolve(undefined);
        await dispatching;

        expect(reported[0]?.handlers).toEqual([
            { handler: 'A', outcome: 'failed' },
            { handler: 'B', outcome: 'handled' }
        ]);
    });
});
