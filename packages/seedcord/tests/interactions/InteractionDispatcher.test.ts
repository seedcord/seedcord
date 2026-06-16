import path from 'node:path';

import { CustomId } from '@seedcord/kit';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { Seedcord } from '@src/Seedcord';

import { testConfig } from '../utils/test-config';
import { TestEnvironment } from '../utils/test-env';

import '../utils/mock-client';
import '../utils/mock-env';

const seedcordPath = path.resolve(__dirname, '../../src/index').replace(/\\/g, '/');

interface PrivateInteractionDispatcher {
    slashMap: Map<string, unknown>;
    buttonMap: Map<string, unknown>;
    modalMap: Map<string, unknown>;
    init(): Promise<void>;
    onHmr(event: unknown): Promise<void>;
    processInteraction(
        interaction: unknown,
        extractKey: (i: unknown) => string,
        getHandler: (key: string) => unknown
    ): Promise<void>;
    handleButton(interaction: unknown): Promise<void>;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- inference is fine here
function fakeSlash(commandName: string) {
    return {
        reply: vi.fn().mockResolvedValue(undefined),
        editReply: vi.fn().mockResolvedValue(undefined),
        followUp: vi.fn().mockResolvedValue(undefined),
        isAutocomplete: () => false,
        isChatInputCommand: () => true,
        isContextMenuCommand: () => false,
        isButton: () => false,
        isAnySelectMenu: () => false,
        isModalSubmit: () => false,
        commandName,
        options: { getSubcommand: () => null, getSubcommandGroup: () => null },
        user: { id: 'u1' },
        guild: null,
        guildId: 'g1',
        channelId: 'c1',
        id: 'i1',
        deferred: false,
        replied: false
    };
}

interface TestBot {
    interactions: PrivateInteractionDispatcher;
}

describe('InteractionDispatcher Integration', () => {
    let testEnv: TestEnvironment;
    let seedcord: Seedcord;

    beforeEach(async () => {
        // @ts-expect-error: Accessing private method for testing
        Seedcord.reset();
        testEnv = new TestEnvironment('interactions-test-');
        await testEnv.setup();
    });

    afterEach(async () => {
        await testEnv.teardown();
        vi.clearAllMocks();
    });

    it('should load interaction handlers from directory', async () => {
        const interactionsDir = 'interactions';
        await testEnv.createFile(
            `${interactionsDir}/Ping.ts`,
            `
            import { SlashHandler, SlashRoute } from '${seedcordPath}';

            @SlashRoute('ping')
            export class PingHandler extends SlashHandler<'ping'> {
                public async execute() {
                    await this.event.reply('Pong!');
                }
            }
            `
        );

        const config = testConfig({ interactions: testEnv.resolvePath(interactionsDir) });

        seedcord = new Seedcord(config);
        // justified: TestBot exposes the private interactions controller for assertion
        const testBot = seedcord.bot as unknown as TestBot;
        await testBot.interactions.init();

        const controller = testBot.interactions;
        expect(controller.slashMap.has('ping')).toBe(true);
    });

    it('routes a thrown error from a handler through the boundary to a reply', async () => {
        const interactionsDir = 'interactions';
        await testEnv.createFile(
            `${interactionsDir}/Boom.ts`,
            `
            import { SlashHandler, SlashRoute } from '${seedcordPath}';

            @SlashRoute('boom')
            export class BoomHandler extends SlashHandler<'boom'> {
                public async execute() {
                    await Promise.resolve();
                    throw new Error('handler exploded');
                }
            }
            `
        );

        const config = testConfig({ interactions: testEnv.resolvePath(interactionsDir) });

        seedcord = new Seedcord(config);
        // justified: TestBot exposes the private interactions controller for assertion
        const controller = (seedcord.bot as unknown as TestBot).interactions;
        await controller.init();

        const interaction = fakeSlash('boom');
        await controller.processInteraction(
            interaction,
            () => 'boom',
            () => controller.slashMap.get('boom')
        );

        expect(interaction.reply).toHaveBeenCalledTimes(1);
    });

    it('skips a component interaction whose customId is owned by an ignoreCustomIds matcher', async () => {
        const ClickId = new CustomId('clickme');
        const config = testConfig({ interactions: testEnv.resolvePath('interactions'), ignoreCustomIds: [ClickId] });

        seedcord = new Seedcord(config);
        const controller = (seedcord.bot as unknown as TestBot).interactions;
        // justified: spy on the private routing entry to assert the ignore gate runs before it
        const processSpy = vi.spyOn(controller, 'processInteraction').mockResolvedValue(undefined);

        await controller.handleButton({ customId: ClickId.encode({}) });
        expect(processSpy).not.toHaveBeenCalled();

        await controller.handleButton({ customId: new CustomId('other').encode({}) });
        expect(processSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle HMR updates for interaction handlers', async () => {
        const interactionsDir = 'interactions';
        const filePath = await testEnv.createFile(
            `${interactionsDir}/Button.ts`,
            `
            import { CustomId, ButtonHandler, ButtonRoute } from '${seedcordPath}';

            const ClickMe = new CustomId('click-me');

            @ButtonRoute(ClickMe)
            export class ClickButton extends ButtonHandler<[typeof ClickMe]> {
                public async execute() {
                    await this.event.reply('Clicked!');
                }
            }
            `
        );

        const config = testConfig({ interactions: testEnv.resolvePath(interactionsDir) });

        seedcord = new Seedcord(config);
        // justified: TestBot exposes the private interactions controller for assertion
        const testBot = seedcord.bot as unknown as TestBot;
        await testBot.interactions.init();

        let controller = testBot.interactions;
        expect(controller.buttonMap.has('click-me')).toBe(true);

        await testEnv.createFile(
            `${interactionsDir}/Button.ts`,
            `
            import { CustomId, ButtonHandler, ButtonRoute } from '${seedcordPath}';

            const DontClickMe = new CustomId('dont-click-me');

            @ButtonRoute(DontClickMe)
            export class ClickButton extends ButtonHandler<[typeof DontClickMe]> {
                public async execute() {
                    await this.event.reply('Why did you click?');
                }
            }
            `
        );

        await testBot.interactions.onHmr({
            file: filePath,
            type: 'update'
        });

        controller = testBot.interactions;
        expect(controller.buttonMap.has('click-me')).toBe(false);
        expect(controller.buttonMap.has('dont-click-me')).toBe(true);
    });

    it('runs a passing gate, then the handler executes', async () => {
        await testEnv.createFile(
            'interactions/Allowed.ts',
            `
            import { defineGate, Gated, SlashHandler, SlashRoute } from '${seedcordPath}';

            const Allow = defineGate('Allow', () => {});

            @Gated(Allow)
            @SlashRoute('allowed')
            export class AllowedHandler extends SlashHandler<'allowed'> {
                public async execute() {
                    await this.event.reply('executed');
                }
            }
            `
        );

        const config = testConfig({ interactions: testEnv.resolvePath('interactions') });

        seedcord = new Seedcord(config);
        const controller = (seedcord.bot as unknown as TestBot).interactions;
        await controller.init();

        const interaction = fakeSlash('allowed');
        await controller.processInteraction(
            interaction,
            () => 'allowed',
            () => controller.slashMap.get('allowed')
        );

        expect(interaction.reply).toHaveBeenCalledWith('executed');
    });

    it('a refusing gate stops the handler before execute', async () => {
        await testEnv.createFile(
            'interactions/Refused.ts',
            `
            import { defineGate, Gated, Silence, SlashHandler, SlashRoute } from '${seedcordPath}';

            const Block = defineGate('Block', () => {
                throw new Silence('blocked');
            });

            @Gated(Block)
            @SlashRoute('refused')
            export class RefusedHandler extends SlashHandler<'refused'> {
                public async execute() {
                    await this.event.reply('executed');
                }
            }
            `
        );

        const config = testConfig({ interactions: testEnv.resolvePath('interactions') });

        seedcord = new Seedcord(config);
        const controller = (seedcord.bot as unknown as TestBot).interactions;
        await controller.init();

        const interaction = fakeSlash('refused');
        await controller.processInteraction(
            interaction,
            () => 'refused',
            () => controller.slashMap.get('refused')
        );

        // the gate threw a Silence, so execute never ran and nothing was replied
        expect(interaction.reply).not.toHaveBeenCalled();
    });

    it('a real OwnerOnly catalog gate refuses a non-owner through the dispatcher', async () => {
        await testEnv.createFile(
            'interactions/Owner.ts',
            `
            import { Gated, OwnerOnly, SlashHandler, SlashRoute } from '${seedcordPath}';

            @Gated(OwnerOnly())
            @SlashRoute('owner')
            export class OwnerHandler extends SlashHandler<'owner'> {
                public async execute() {
                    await this.event.reply('executed');
                }
            }
            `
        );

        const config = testConfig({ interactions: testEnv.resolvePath('interactions'), ownerIds: ['someone-else'] });

        seedcord = new Seedcord(config);
        const controller = (seedcord.bot as unknown as TestBot).interactions;
        await controller.init();

        const interaction = fakeSlash('owner');
        await controller.processInteraction(
            interaction,
            () => 'owner',
            () => controller.slashMap.get('owner')
        );

        // the non-owner is refused, so execute never replied 'executed', the boundary rendered NotOwner instead
        expect(interaction.reply).not.toHaveBeenCalledWith('executed');
        expect(interaction.reply).toHaveBeenCalledTimes(1);
    });

    it('a real OwnerOnly catalog gate passes a configured owner through the dispatcher', async () => {
        await testEnv.createFile(
            'interactions/Owner.ts',
            `
            import { Gated, OwnerOnly, SlashHandler, SlashRoute } from '${seedcordPath}';

            @Gated(OwnerOnly())
            @SlashRoute('owner')
            export class OwnerHandler extends SlashHandler<'owner'> {
                public async execute() {
                    await this.event.reply('executed');
                }
            }
            `
        );

        const config = testConfig({ interactions: testEnv.resolvePath('interactions'), ownerIds: ['u1'] });

        seedcord = new Seedcord(config);
        const controller = (seedcord.bot as unknown as TestBot).interactions;
        await controller.init();

        const interaction = fakeSlash('owner');
        await controller.processInteraction(
            interaction,
            () => 'owner',
            () => controller.slashMap.get('owner')
        );

        expect(interaction.reply).toHaveBeenCalledWith('executed');
    });
});
