import { describe, expect, vi } from 'vitest';

import { Seedcord } from '#src/Seedcord';
import { dispatcherOf } from '#tests/utils/dispatcherOf';
import { seedcordPath } from '#tests/utils/source-path';
import { testConfig } from '#tests/utils/test-config';
import { it } from '#tests/utils/test-env';

describe('once event handlers', () => {
    it('marks a once handler spent even when it throws a non-Error, so it does not run again', async ({ testEnv }) => {
        await testEnv.createFile(
            'events/OnceBoom.ts',
            `
            import { EventHandler, RegisterEvent } from '${seedcordPath}';
            import { Events } from 'discord.js';

            @RegisterEvent(['guildMemberAdd', { frequency: 'once' }])
            export class OnceBoom extends EventHandler<Events.GuildMemberAdd> {
                public async execute() {
                    await this.match({ guildMemberAdd: (member) => member.setNickname('ran') });
                    throw 'raw string';
                }
            }
            `
        );

        await using seedcord = new Seedcord(testConfig({ events: testEnv.resolvePath('events') }));
        const events = dispatcherOf(seedcord);
        await events.init();

        const member = { setNickname: vi.fn() };
        await events.processEvent('guildMemberAdd', [member]);
        await events.processEvent('guildMemberAdd', [member]);

        expect(member.setNickname).toHaveBeenCalledTimes(1);
    });

    it('runs a once handler exactly once when the same event is emitted concurrently', async ({ testEnv }) => {
        await testEnv.createFile(
            'events/OnceConcurrent.ts',
            `
            import { EventHandler, RegisterEvent } from '${seedcordPath}';
            import { Events } from 'discord.js';

            @RegisterEvent(['messageCreate', { frequency: 'once' }])
            export class OnceConcurrent extends EventHandler<Events.MessageCreate> {
                public async execute() {
                    await this.match({ messageCreate: (message) => message.reply('once') });
                }
            }
            `
        );

        await using seedcord = new Seedcord(testConfig({ events: testEnv.resolvePath('events') }));
        const events = dispatcherOf(seedcord);
        await events.init();

        // both dispatches pass the once filter because runMiddlewares awaits between the snapshot and the claim
        const message = { reply: vi.fn() };
        await Promise.all([
            events.processEvent('messageCreate', [message]),
            events.processEvent('messageCreate', [message])
        ]);

        expect(message.reply).toHaveBeenCalledTimes(1);
    });

    it('does not consume a once handler when middleware blocks the dispatch', async ({ testEnv }) => {
        await testEnv.createFile(
            'events/OnceAfterBlock.ts',
            `
            import { EventHandler, RegisterEvent } from '${seedcordPath}';
            import { Events } from 'discord.js';

            @RegisterEvent(['messageCreate', { frequency: 'once' }])
            export class OnceAfterBlock extends EventHandler<Events.MessageCreate> {
                public async execute() {
                    await this.match({ messageCreate: (message) => message.reply('ran') });
                }
            }
            `
        );
        await testEnv.createFile(
            'event-mw/BlockFirst.ts',
            `
            import { RegisterEventMiddleware, EventMiddleware, Silence } from '${seedcordPath}';

            let fires = 0;

            @RegisterEventMiddleware()
            export class BlockFirst extends EventMiddleware {
                public async execute() {
                    fires++;
                    if (fires === 1) throw new Silence('block the first dispatch');
                }
            }
            `
        );

        const config = testConfig({
            events: testEnv.resolvePath('events'),
            eventMiddlewares: testEnv.resolvePath('event-mw')
        });
        await using seedcord = new Seedcord(config);
        const events = dispatcherOf(seedcord);
        await events.init();

        const message = { reply: vi.fn() };
        await events.processEvent('messageCreate', [message]);
        expect(message.reply).not.toHaveBeenCalled();

        await events.processEvent('messageCreate', [message]);
        expect(message.reply).toHaveBeenCalledTimes(1);
    });

    it('runs each once event of one class once, and its other events every time', async ({ testEnv }) => {
        await testEnv.createFile(
            'events/Greeter.ts',
            `
            import { EventHandler, RegisterEvent } from '${seedcordPath}';
            import { Events } from 'discord.js';

            @RegisterEvent(
                ['messageCreate', { frequency: 'once' }],
                ['messageUpdate', { frequency: 'once' }],
                ['messageDelete']
            )
            export class Greeter extends EventHandler<Events.MessageCreate | Events.MessageUpdate | Events.MessageDelete> {
                public async execute() {
                    await this.match({
                        messageCreate: (message) => message.reply('created'),
                        messageUpdate: (_old, edited) => edited.reply('updated'),
                        messageDelete: (message) => message.reply('deleted')
                    });
                }
            }
            `
        );

        await using seedcord = new Seedcord(testConfig({ events: testEnv.resolvePath('events') }));
        const events = dispatcherOf(seedcord);
        await events.init();

        const message = { reply: vi.fn() };
        for (let fire = 0; fire < 2; fire++) {
            await events.processEvent('messageCreate', [message]);
            await events.processEvent('messageUpdate', [{}, message]);
            await events.processEvent('messageDelete', [message]);
        }

        expect(message.reply.mock.calls.flat()).toEqual(['created', 'updated', 'deleted', 'deleted']);
    });

    it('keeps a spent once handler spent after a failed reload rolls it back', async ({ testEnv }) => {
        const filePath = await testEnv.createFile(
            'events/OnceRollback.ts',
            `
            import { EventHandler, RegisterEvent } from '${seedcordPath}';
            import { Events } from 'discord.js';

            @RegisterEvent(['messageCreate', { frequency: 'once' }])
            export class OnceRollback extends EventHandler<Events.MessageCreate> {
                public async execute() {
                    await this.match({ messageCreate: (message) => message.reply('once') });
                }
            }
            `
        );

        await using seedcord = new Seedcord(testConfig({ events: testEnv.resolvePath('events') }));
        const events = dispatcherOf(seedcord);
        await events.init();

        const message = { reply: vi.fn() };
        await events.processEvent('messageCreate', [message]);

        await testEnv.createFile('events/OnceRollback.ts', 'export const broken = {{{ not valid');
        await events.onHmr({ file: filePath, type: 'update' });
        await events.processEvent('messageCreate', [message]);

        expect(message.reply).toHaveBeenCalledTimes(1);
    });
});
