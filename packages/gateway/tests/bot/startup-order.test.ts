import { StartupPhase } from '@seedcord/core/node/internal';
import { Events } from 'discord.js';
import { describe, expect, vi } from 'vite-plus/test';

import { seedcordPath } from '#tests/utils/source-path';
import { testConfig } from '#tests/utils/test-config';
import { it } from '#tests/utils/test-env';

import type { Mock } from 'vite-plus/test';

type Listener = (...args: unknown[]) => void;

describe('gateway startup order', () => {
    it('holds interactions and events that arrive during Login until Ready', async ({ testEnv, seedcordWith }) => {
        await testEnv.createDir('interactions');
        await testEnv.createFile(
            'events/Ping.ts',
            `
            import { EventHandler, RegisterEvent } from '${seedcordPath}';
            import { Events } from 'discord.js';

            @RegisterEvent(['messageCreate'])
            export class Ping extends EventHandler<Events.MessageCreate> {
                public async execute() {}
            }
            `
        );
        const seedcord = seedcordWith(
            testConfig({
                interactions: testEnv.resolvePath('interactions'),
                events: testEnv.resolvePath('events'),
                healthCheck: false
            })
        );
        vi.spyOn(seedcord.bot, 'botToken', 'get').mockReturnValue('token');
        // justified: setup.ts replaces the discord.js Client with plain vi.fn stubs
        const client = seedcord.bot.client as unknown as { on: Mock; once: Mock };
        client.once.mockImplementation((event: Events, onReady: () => void) => {
            if (event === Events.ClientReady) onReady();
        });
        const listenerFor = (event: string): Listener | undefined =>
            client.on.mock.calls.find(([name]) => name === event)?.[1] as Listener | undefined;

        const finishLogin = Promise.withResolvers<undefined>();
        const loginStarted = Promise.withResolvers<undefined>();
        seedcord.startup.addTask(StartupPhase.Login, 'held', () => {
            loginStarted.resolve(undefined);
            return finishLogin.promise;
        });

        const dispatched: string[] = [];
        seedcord.bus.on('eventDispatching', ({ name }) => dispatched.push(name));
        seedcord.bus.on('anyInteraction', () => dispatched.push('interaction'));

        const starting = seedcord.start();
        await loginStarted.promise;
        listenerFor(Events.MessageCreate)?.({ id: 'm1' });
        listenerFor(Events.InteractionCreate)?.({ id: 'i1' });
        await new Promise((resolve) => setImmediate(resolve));
        const duringLogin = [...dispatched];

        finishLogin.resolve(undefined);
        await starting;

        expect([duringLogin, dispatched.toSorted()]).toEqual([[], ['interaction', 'messageCreate']]);
    });
});
