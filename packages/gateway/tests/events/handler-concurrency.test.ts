import { describe, expect, vi } from 'vitest';

import { Seedcord } from '#src/Seedcord';
import { dispatcherOf } from '#tests/utils/dispatcherOf';
import { seedcordPath } from '#tests/utils/source-path';
import { testConfig } from '#tests/utils/test-config';
import { it } from '#tests/utils/test-env';

import type { TestEnvironment } from '#tests/utils/test-env';
import type { SubscriptionData } from '@seedcord/core';

// A loads before B
async function writeHandlers(testEnv: TestEnvironment, armA: string, armB: string): Promise<void> {
    const handler = (name: string, arm: string): string => `
        import { EventHandler, Notice, RegisterEvent } from '${seedcordPath}';
        import { Events } from 'discord.js';

        class BrokenReport extends Notice {
            public override report = true;
            public constructor() {
                super('broken');
            }
            public render(): never {
                throw new Error('render threw');
            }
        }

        @RegisterEvent(['messageCreate'])
        export class ${name} extends EventHandler<Events.MessageCreate> {
            public async execute() {
                await this.match({ messageCreate: (message) => ${arm} });
            }
        }
    `;
    await testEnv.createFile('events/A.ts', handler('A', armA));
    await testEnv.createFile('events/B.ts', handler('B', armB));
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

    it('keep their own results when one fault report throws', async ({ testEnv }) => {
        await writeHandlers(testEnv, 'Promise.reject(new BrokenReport())', 'message.wait()');
        const { seedcord, events, reported } = await bootWithReports(testEnv);
        await using _seedcord = seedcord;
        const unhandled: string[] = [];
        seedcord.bus.on('unhandledEventError', ({ error }) => unhandled.push(error.message));

        const release = Promise.withResolvers<undefined>();
        const message = { wait: () => release.promise };
        const dispatching = events.processEvent('messageCreate', [message]);
        await vi.waitFor(() => expect(unhandled).toEqual(['render threw']));
        expect(reported).toHaveLength(0);
        release.resolve(undefined);
        await dispatching;

        expect(reported[0]?.handlers).toEqual([
            { handler: 'A', outcome: 'failed' },
            { handler: 'B', outcome: 'handled' }
        ]);
    });
});
