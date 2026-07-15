/* eslint-disable max-lines -- one integration suite per dispatcher, splitting fragments the shared test env */
import path from 'node:path';

import { CustomId } from '@seedcord/core';
import { SeedcordErrorCode } from '@seedcord/errors';
import { Logger } from '@seedcord/logger';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { CONFIRM_DEF } from '@bot/confirm/reserved';
import { Seedcord } from '@src/Seedcord';

import { testConfig } from '../utils/test-config';
import { TestEnvironment } from '../utils/test-env';

import '../utils/mock-client';
import '../utils/mock-env';

const seedcordPath = path.resolve(__dirname, '../../src/index').replaceAll('\\', '/');

interface PrivateInteractionDispatcher {
    slashMap: Map<string, unknown>;
    buttonMap: Map<string, unknown>;
    modalMap: Map<string, unknown>;
    init(): Promise<void>;
    onHmr(event: unknown): Promise<void>;
    processInteraction(
        interaction: unknown,
        extractKey: (i: unknown) => string,
        getHandler: (key: string) => unknown,
        fallback?: unknown
    ): Promise<void>;
    handleButton(interaction: unknown): Promise<void>;
    handleAutocomplete(interaction: unknown): Promise<void>;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- inference is fine here
function fakeSlash(commandName: string) {
    return {
        reply: vi.fn().mockResolvedValue({ resource: { message: { id: 'fault-msg' } } }),
        deferReply: vi.fn().mockResolvedValue(undefined),
        editReply: vi.fn().mockResolvedValue({ id: 'fault-msg' }),
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
        replied: false,
        ephemeral: null as boolean | null
    };
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- inference is fine here
function fakeAutocomplete(commandName: string) {
    return {
        respond: vi.fn().mockResolvedValue(undefined),
        isAutocomplete: () => true,
        isChatInputCommand: () => false,
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
        id: 'i1'
    };
}

interface TestBot {
    interactions: PrivateInteractionDispatcher;
}

// justified: reach the private interactions dispatcher off the bot to assert its routing state
function controllerOf(instance: Seedcord): PrivateInteractionDispatcher {
    return (instance.bot as unknown as TestBot).interactions;
}

describe('InteractionDispatcher Integration', () => {
    let testEnv: TestEnvironment;
    let seedcord: Seedcord;

    beforeEach(async () => {
        // @ts-expect-error Accessing private method for testing
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

    it('a throwing any:interaction observer does not abort the dispatch', async () => {
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

        // capture the interactionCreate handler attachToClient registers on the client
        const onSpy = vi.spyOn(seedcord.bot.client, 'on');
        await testBot.interactions.init();

        seedcord.bot.on('any:interaction', () => {
            throw new Error('observer boom');
        });

        const fire = onSpy.mock.calls.find(([event]) => event === 'interactionCreate')?.[1] as
            | ((i: unknown) => void)
            | undefined;

        expect(fire).toBeDefined();
        expect(() => fire?.(fakeSlash('ping'))).not.toThrow();
    });

    it('throws when two handlers register the same interaction route, naming both', async () => {
        const interactionsDir = 'interactions';
        await testEnv.createFile(
            `${interactionsDir}/PingOne.ts`,
            `
            import { SlashHandler, SlashRoute } from '${seedcordPath}';

            @SlashRoute('ping')
            export class PingOne extends SlashHandler<'ping'> {
                public async execute() {
                    await this.event.reply('one');
                }
            }
            `
        );
        await testEnv.createFile(
            `${interactionsDir}/PingTwo.ts`,
            `
            import { SlashHandler, SlashRoute } from '${seedcordPath}';

            @SlashRoute('ping')
            export class PingTwo extends SlashHandler<'ping'> {
                public async execute() {
                    await this.event.reply('two');
                }
            }
            `
        );

        const config = testConfig({ interactions: testEnv.resolvePath(interactionsDir) });

        seedcord = new Seedcord(config);
        const controller = controllerOf(seedcord);

        const error: unknown = await controller.init().then(
            () => null,
            (caught: unknown) => caught
        );
        expect(error).toMatchObject({ code: SeedcordErrorCode.InteractionDuplicateRoute });
        const message = Error.isError(error) ? error.message : String(error);
        expect(message).toContain('PingOne');
        expect(message).toContain('PingTwo');
    });

    it('throws when two interaction middleware classes share a name instead of overwriting', async () => {
        const middlewaresDir = 'interaction-mw';

        await testEnv.createFile(
            'interactions/Noop.ts',
            `
            import { SlashHandler, SlashRoute } from '${seedcordPath}';

            @SlashRoute('noop')
            export class Noop extends SlashHandler<'noop'> {
                public async execute() {
                    await Promise.resolve();
                }
            }
            `
        );

        for (const file of ['RateLimitA', 'RateLimitB']) {
            await testEnv.createFile(
                `${middlewaresDir}/${file}.ts`,
                `
                import { Middleware, MiddlewareType, InteractionMiddleware } from '${seedcordPath}';

                @Middleware(MiddlewareType.Interaction, 0)
                export class RateLimit extends InteractionMiddleware {
                    public async execute() {
                        await Promise.resolve();
                    }
                }
                `
            );
        }

        const config = testConfig({
            interactions: testEnv.resolvePath('interactions'),
            interactionMiddlewares: testEnv.resolvePath(middlewaresDir)
        });

        seedcord = new Seedcord(config);
        const controller = controllerOf(seedcord);

        const error: unknown = await controller.init().then(
            () => null,
            (caught: unknown) => caught
        );
        expect(error).toMatchObject({ code: SeedcordErrorCode.InteractionDuplicateMiddleware });
        const message = Error.isError(error) ? error.message : String(error);
        expect(message).toContain('RateLimit');
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
        const controller = controllerOf(seedcord);
        await controller.init();

        const interaction = fakeSlash('boom');
        const boundaryError = vi.spyOn(Logger.prototype, 'error');
        await controller.processInteraction(
            interaction,
            () => 'boom',
            () => controller.slashMap.get('boom')
        );

        expect(interaction.reply).toHaveBeenCalledTimes(1);
        expect(boundaryError).not.toHaveBeenCalledWith('reply send failed', expect.anything());
    });

    it("passes the handler's live sender to the boundary, so a defer-then-throw follows up through its ack state", async () => {
        const interactionsDir = 'interactions';
        await testEnv.createFile(
            `${interactionsDir}/DeferBoom.ts`,
            `
            import { SlashHandler, SlashRoute } from '${seedcordPath}';

            @SlashRoute('deferboom')
            export class DeferBoomHandler extends SlashHandler<'deferboom'> {
                public async execute() {
                    await this.defer();
                    throw new Error('handler exploded after deferring');
                }
            }
            `
        );

        const config = testConfig({ interactions: testEnv.resolvePath(interactionsDir) });

        seedcord = new Seedcord(config);
        const controller = controllerOf(seedcord);
        await controller.init();

        const interaction = fakeSlash('deferboom');
        const boundaryError = vi.spyOn(Logger.prototype, 'error');
        await controller.processInteraction(
            interaction,
            () => 'deferboom',
            () => controller.slashMap.get('deferboom')
        );

        // the handler acked with a deferReply, so the boundary's live sender is deferred-reply and edits @original
        expect(interaction.deferReply).toHaveBeenCalledTimes(1);
        expect(interaction.editReply).toHaveBeenCalledTimes(1);
        expect(interaction.reply).not.toHaveBeenCalled();
        expect(boundaryError).not.toHaveBeenCalledWith('reply send failed', expect.anything());
    });

    it('dispatches UnhandledAutocomplete for an autocomplete with no registered handler, responding empty', async () => {
        const config = testConfig({ interactions: testEnv.resolvePath('interactions') });

        seedcord = new Seedcord(config);
        const controller = controllerOf(seedcord);
        await controller.init();

        const interaction = fakeAutocomplete('unregistered');
        await controller.handleAutocomplete(interaction);

        expect(interaction.respond).toHaveBeenCalledWith([]);
    });

    it('routes a registered autocomplete through handleAutocomplete to the handler respond', async () => {
        const interactionsDir = 'interactions';
        await testEnv.createFile(
            `${interactionsDir}/SearchAutocomplete.ts`,
            `
            import { AutocompleteRoute, AutocompleteHandler } from '${seedcordPath}';

            @AutocompleteRoute('search')
            export class SearchAutocomplete extends AutocompleteHandler<'search'> {
                public async execute() {
                    await this.respond([{ name: 'apple', value: 'apple' }]);
                }
            }
            `
        );

        const config = testConfig({ interactions: testEnv.resolvePath(interactionsDir) });

        seedcord = new Seedcord(config);
        const controller = controllerOf(seedcord);
        await controller.init();

        const interaction = fakeAutocomplete('search');
        await controller.handleAutocomplete(interaction);

        expect(interaction.respond).toHaveBeenCalledWith([{ name: 'apple', value: 'apple' }]);
    });

    it('skips a component interaction whose customId is owned by an ignoreCustomIds matcher', async () => {
        const ClickId = new CustomId('clickme');
        const config = testConfig({ interactions: testEnv.resolvePath('interactions'), ignoreCustomIds: [ClickId] });

        seedcord = new Seedcord(config);
        const controller = controllerOf(seedcord);
        // justified: spy on the private routing entry to assert the ignore gate runs before it
        const processSpy = vi.spyOn(controller, 'processInteraction').mockResolvedValue(undefined);

        await controller.handleButton({ customId: ClickId.encode({}) });
        expect(processSpy).not.toHaveBeenCalled();

        await controller.handleButton({ customId: new CustomId('other').encode({}) });
        expect(processSpy).toHaveBeenCalledTimes(1);
    });

    it('ignores the reserved confirm prefix so a confirm click never reaches the global router', async () => {
        const config = testConfig({ interactions: testEnv.resolvePath('interactions') });

        seedcord = new Seedcord(config);
        const controller = controllerOf(seedcord);
        const processSpy = vi.spyOn(controller, 'processInteraction').mockResolvedValue(undefined);

        await controller.handleButton({ customId: CONFIRM_DEF.encode({ choice: 'confirm' }) });
        expect(processSpy).not.toHaveBeenCalled();

        await controller.handleButton({ customId: new CustomId('not-ignored').encode({}) });
        expect(processSpy).toHaveBeenCalledTimes(1);
    });

    it('rolls back to the last-good handler when a reload fails', async () => {
        const interactionsDir = 'interactions';
        const filePath = await testEnv.createFile(
            `${interactionsDir}/Ping.ts`,
            `
            import { SlashHandler, SlashRoute } from '${seedcordPath}';

            @SlashRoute('ping')
            export class PingHandler extends SlashHandler<'ping'> {
                public async execute() {
                    await this.event.reply('pong');
                }
            }
            `
        );

        const config = testConfig({ interactions: testEnv.resolvePath(interactionsDir) });

        seedcord = new Seedcord(config);
        const controller = controllerOf(seedcord);
        await controller.init();
        expect(controller.slashMap.has('ping')).toBe(true);

        // a broken edit, the reload import throws
        await testEnv.createFile(`${interactionsDir}/Ping.ts`, 'export const broken = {{{ not valid');
        await controller.onHmr({ file: filePath, type: 'update' });

        // the failed reload restored the last-good handler and kept the route
        expect(controller.slashMap.has('ping')).toBe(true);
    });

    it('rolls back both handlers when a reload introduces a duplicate route in one file', async () => {
        const interactionsDir = 'interactions';
        const filePath = await testEnv.createFile(
            `${interactionsDir}/Pair.ts`,
            `
            import { SlashHandler, SlashRoute } from '${seedcordPath}';

            @SlashRoute('alpha')
            export class AlphaHandler extends SlashHandler<'alpha'> {
                public async execute() {
                    await this.event.reply('a');
                }
            }

            @SlashRoute('beta')
            export class BetaHandler extends SlashHandler<'beta'> {
                public async execute() {
                    await this.event.reply('b');
                }
            }
            `
        );

        const config = testConfig({ interactions: testEnv.resolvePath(interactionsDir) });

        seedcord = new Seedcord(config);
        const controller = controllerOf(seedcord);
        await controller.init();
        expect(controller.slashMap.has('alpha')).toBe(true);
        expect(controller.slashMap.has('beta')).toBe(true);

        // a broken edit, both handlers now claim 'alpha', so the reload throws a duplicate-route mid-registration
        await testEnv.createFile(
            `${interactionsDir}/Pair.ts`,
            `
            import { SlashHandler, SlashRoute } from '${seedcordPath}';

            @SlashRoute('alpha')
            export class AlphaHandler extends SlashHandler<'alpha'> {
                public async execute() {
                    await this.event.reply('a');
                }
            }

            @SlashRoute('alpha')
            export class BetaHandler extends SlashHandler<'alpha'> {
                public async execute() {
                    await this.event.reply('a');
                }
            }
            `
        );

        // rollback must clear the partial registration first, so restoring both old routes does not re-collide
        await expect(controller.onHmr({ file: filePath, type: 'update' })).resolves.toBeUndefined();
        expect(controller.slashMap.has('alpha')).toBe(true);
        expect(controller.slashMap.has('beta')).toBe(true);
    });

    it('rolls back when a multi-route handler reload collides on a later route owned by another file', async () => {
        const interactionsDir = 'interactions';

        await testEnv.createFile(
            `${interactionsDir}/Keeper.ts`,
            `
            import { CustomId, ButtonHandler, ButtonRoute } from '${seedcordPath}';

            const Shared = new CustomId('shared');

            @ButtonRoute(Shared)
            export class KeeperButton extends ButtonHandler<[typeof Shared]> {
                public async execute() {
                    await this.event.reply('keeper');
                }
            }
            `
        );

        const multiPath = await testEnv.createFile(
            `${interactionsDir}/Multi.ts`,
            `
            import { CustomId, ButtonHandler, ButtonRoute } from '${seedcordPath}';

            const Own = new CustomId('own');

            @ButtonRoute(Own)
            export class MultiButton extends ButtonHandler<[typeof Own]> {
                public async execute() {
                    await this.event.reply('own');
                }
            }
            `
        );

        const config = testConfig({ interactions: testEnv.resolvePath(interactionsDir) });

        seedcord = new Seedcord(config);
        const controller = controllerOf(seedcord);
        await controller.init();
        expect(controller.buttonMap.has('own')).toBe(true);
        expect(controller.buttonMap.has('shared')).toBe(true);
        const lastGood = controller.buttonMap.get('own');

        // the edit claims a route Keeper owns, so registration throws after setting 'own', orphaning it
        await testEnv.createFile(
            `${interactionsDir}/Multi.ts`,
            `
            import { CustomId, ButtonHandler, ButtonRoute } from '${seedcordPath}';

            const Own = new CustomId('own');
            const Shared = new CustomId('shared');

            @ButtonRoute(Own, Shared)
            export class MultiButton extends ButtonHandler<[typeof Own, typeof Shared]> {
                public async execute() {
                    await this.event.reply('own');
                }
            }
            `
        );

        // rollback restores the last-good handler and must not re-collide on the orphaned route
        await expect(controller.onHmr({ file: multiPath, type: 'update' })).resolves.toBeUndefined();
        expect(controller.buttonMap.get('own')).toBe(lastGood);
        expect(controller.buttonMap.has('shared')).toBe(true);
    });

    it('drops the failed unit when the event disables rollback', async () => {
        const interactionsDir = 'interactions';
        const filePath = await testEnv.createFile(
            `${interactionsDir}/Ping.ts`,
            `
            import { SlashHandler, SlashRoute } from '${seedcordPath}';

            @SlashRoute('ping')
            export class PingHandler extends SlashHandler<'ping'> {
                public async execute() {
                    await this.event.reply('pong');
                }
            }
            `
        );

        const config = testConfig({ interactions: testEnv.resolvePath(interactionsDir) });

        seedcord = new Seedcord(config);
        const controller = controllerOf(seedcord);
        await controller.init();
        expect(controller.slashMap.has('ping')).toBe(true);

        // a broken edit with rollback disabled, so the route is dropped
        await testEnv.createFile(`${interactionsDir}/Ping.ts`, 'export const broken = {{{ not valid');
        await controller.onHmr({ file: filePath, type: 'update', rollback: false });

        expect(controller.slashMap.has('ping')).toBe(false);
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
        const controller = controllerOf(seedcord);
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
        const controller = controllerOf(seedcord);
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
        const controller = controllerOf(seedcord);
        await controller.init();

        const interaction = fakeSlash('owner');
        await controller.processInteraction(
            interaction,
            () => 'owner',
            () => controller.slashMap.get('owner')
        );

        // the non-owner is refused, so execute never replied 'executed', the boundary rendered NotOwner
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
        const controller = controllerOf(seedcord);
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
