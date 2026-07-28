/* eslint-disable max-lines -- one integration suite per dispatcher, splitting fragments the shared test env */

import { CustomId } from '@seedcord/core';
import { SeedcordErrorCode } from '@seedcord/errors';
import { Logger } from '@seedcord/logger';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { CONFIRM_DEF } from '@bot/confirm/reserved';
import { Seedcord } from '@src/Seedcord';

import { seedcordPath } from '../utils/source-path';
import { testConfig } from '../utils/test-config';
import { TestEnvironment } from '../utils/test-env';

import type { SubscriptionData } from '@seedcord/core';

import '../utils/mock-client';
import '../utils/mock-env';

interface PrivateInteractionDispatcher {
    slashMap: Map<string, unknown>;
    buttonMap: Map<string, unknown>;
    modalMap: Map<string, unknown>;
    init(): Promise<void>;
    onHmr(event: unknown): Promise<void>;
    // only ever spied on, so the parameters stay loose
    processInteraction(...args: unknown[]): Promise<void>;
    handleSlashCommand(interaction: unknown): Promise<void>;
    handleButton(interaction: unknown): Promise<void>;
    handleAutocomplete(interaction: unknown): Promise<void>;
    stopAccepting(): void;
    drain(timeoutMs: number): Promise<void>;
    handleInteraction(interaction: unknown): Promise<void>;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- the type is the literal below
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
        memberPermissions: null,
        appPermissions: { bitfield: 0n },
        id: 'i1',
        deferred: false,
        replied: false,
        ephemeral: null as boolean | null
    };
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- the type is the literal below
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

// justified: access the private interactions dispatcher off the bot to assert its routing state
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
        vi.restoreAllMocks();
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

    it('a throwing anyInteraction observer does not abort the dispatch', async () => {
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

        seedcord.bus.on('anyInteraction', () => {
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
        expect(message).toContain('slash:ping');
        expect(message).toContain('PingOne (');
        expect(message).toContain('PingOne.ts');
        expect(message).toContain('PingTwo (');
        expect(message).toContain('PingTwo.ts');
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
        await controller.handleSlashCommand(interaction);

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
        await controller.handleSlashCommand(interaction);

        // the handler acked with a deferReply, so the boundary's live sender is deferred-reply and edits @original
        expect(interaction.deferReply).toHaveBeenCalledTimes(1);
        expect(interaction.editReply).toHaveBeenCalledTimes(1);
        expect(interaction.reply).not.toHaveBeenCalled();
        expect(boundaryError).not.toHaveBeenCalledWith('reply send failed', expect.anything());
    });

    it('dispatches UnhandledAutocomplete for an autocomplete with no registered handler, responding empty', async () => {
        await testEnv.createDir('interactions');
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

        // a broken edit with rollback disabled
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

    describe('gates', () => {
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
            await controller.handleSlashCommand(interaction);

            expect(interaction.reply).toHaveBeenCalledWith('executed');
        });

        it('warns on a gate check that crosses the slow-gate threshold', async () => {
            await testEnv.createFile(
                'interactions/Sluggish.ts',
                `
                import { defineGate, Gated, SlashHandler, SlashRoute } from '${seedcordPath}';

                const Sluggish = defineGate('Sluggish', () => {});

                @Gated(Sluggish)
                @SlashRoute('sluggish')
                export class SluggishHandler extends SlashHandler<'sluggish'> {
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

            const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
            // monotonic +800ms per reading, so any check's start-to-end pair crosses the 750ms threshold
            let reading = 0;
            vi.spyOn(performance, 'now').mockImplementation(() => (reading += 800));

            const interaction = fakeSlash('sluggish');
            await controller.handleSlashCommand(interaction);

            expect(warn.mock.calls.some(([message]) => String(message).includes('Sluggish'))).toBe(true);
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
            await controller.handleSlashCommand(interaction);

            // the gate threw a Silence, so execute never ran
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

            const config = testConfig({
                interactions: testEnv.resolvePath('interactions'),
                ownerIds: ['someone-else']
            });

            seedcord = new Seedcord(config);
            const controller = controllerOf(seedcord);
            await controller.init();

            const interaction = fakeSlash('owner');
            await controller.handleSlashCommand(interaction);

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
            await controller.handleSlashCommand(interaction);

            expect(interaction.reply).toHaveBeenCalledWith('executed');
        });
    });

    describe('client-attached dispatch', () => {
        async function clientHarness(): Promise<{
            controller: PrivateInteractionDispatcher;
            fire: ((i: unknown) => void) | undefined;
        }> {
            await testEnv.createDir('interactions');
            const config = testConfig({ interactions: testEnv.resolvePath('interactions') });
            seedcord = new Seedcord(config);
            const controller = controllerOf(seedcord);

            const onSpy = vi.spyOn(seedcord.bot.client, 'on');
            await controller.init();

            const fire = onSpy.mock.calls.find(([event]) => event === 'interactionCreate')?.[1] as
                | ((i: unknown) => void)
                | undefined;
            expect(fire).toBeDefined();
            return { controller, fire };
        }

        it('runs later unhandledInteractionError listeners after an earlier one throws', async () => {
            const { controller, fire } = await clientHarness();
            vi.spyOn(controller, 'handleInteraction').mockRejectedValue(new Error('boom'));
            vi.spyOn(seedcord.bot.logger, 'error').mockImplementation(() => undefined);

            let reached = false;
            seedcord.bus.on('unhandledInteractionError', () => {
                throw new Error('listener blew up');
            });
            seedcord.bus.on('unhandledInteractionError', () => {
                reached = true;
            });

            fire?.(fakeSlash('ping'));

            await vi.waitFor(() => {
                expect(reached).toBe(true);
            });
        });

        it('stops dispatching new interactions after stopAccepting, and drain resolves', async () => {
            const { controller, fire } = await clientHarness();
            const handleSpy = vi.spyOn(controller, 'handleInteraction').mockResolvedValue(undefined);

            fire?.(fakeSlash('ping'));
            expect(handleSpy).toHaveBeenCalledTimes(1);

            controller.stopAccepting();
            fire?.(fakeSlash('ping'));
            // draining, so no new dispatch started
            expect(handleSpy).toHaveBeenCalledTimes(1);

            await expect(controller.drain(50)).resolves.toBeUndefined();
        });

        it('drain waits for an in-flight run that settles inside the budget', async () => {
            const { controller, fire } = await clientHarness();

            let settled = false;
            vi.spyOn(controller, 'handleInteraction').mockImplementation(
                () =>
                    new Promise<void>((resolve) => {
                        setTimeout(() => {
                            settled = true;
                            resolve();
                        }, 20);
                    })
            );
            fire?.(fakeSlash('ping'));
            controller.stopAccepting();

            await controller.drain(1000);
            expect(settled).toBe(true);
        });

        it('drain returns through the timer when an in-flight run never settles', async () => {
            const { controller, fire } = await clientHarness();

            vi.spyOn(controller, 'handleInteraction').mockReturnValue(new Promise<void>(() => undefined));
            fire?.(fakeSlash('ping'));
            controller.stopAccepting();

            await expect(controller.drain(30)).resolves.toBeUndefined();
        });

        it('clears the drain timer when the in-flight set settles first', async () => {
            const { controller, fire } = await clientHarness();
            vi.spyOn(controller, 'handleInteraction').mockResolvedValue(undefined);
            fire?.(fakeSlash('ping'));
            controller.stopAccepting();

            vi.useFakeTimers();
            await controller.drain(5000);
            expect(vi.getTimerCount()).toBe(0);
            vi.useRealTimers();
        });

        it('a full-budget drain completes the Drain phase without a task timeout', async () => {
            const { controller, fire } = await clientHarness();

            // a run that outlives the drain budget forces the dispatcher timer to settle the race
            vi.spyOn(controller, 'handleInteraction').mockReturnValue(new Promise<void>(() => undefined));
            fire?.(fakeSlash('ping'));

            vi.useFakeTimers();
            const infos = vi.spyOn(Logger.prototype, 'info');
            const errors = vi.spyOn(Logger.prototype, 'error');
            const run = seedcord.shutdown.run(0, false);
            await vi.advanceTimersByTimeAsync(10_000);
            await run;
            vi.useRealTimers();

            const finished = infos.mock.calls.some(
                ([msg]) => String(msg).includes('Drain') && String(msg).includes('completed successfully')
            );
            expect(finished).toBe(true);
            expect(errors.mock.calls.flat().map(String).join('\n')).not.toContain('Drain');
        });
    });

    describe('interactionDispatched', () => {
        async function dispatchedFor(
            source: string,
            commandName: string,
            middleware?: string
        ): Promise<SubscriptionData<'interactionDispatched'>[]> {
            await testEnv.createFile('interactions/Route.ts', source);
            if (middleware) await testEnv.createFile('middlewares/Mw.ts', middleware);
            const config = testConfig({
                interactions: testEnv.resolvePath('interactions'),
                ownerIds: ['nobody'],
                ...(middleware && { interactionMiddlewares: testEnv.resolvePath('middlewares') })
            });

            seedcord = new Seedcord(config);
            const controller = controllerOf(seedcord);
            await controller.init();

            const published: SubscriptionData<'interactionDispatched'>[] = [];
            seedcord.bus.on('interactionDispatched', (payload) => published.push(payload));

            await controller.handleSlashCommand(fakeSlash(commandName));
            return published;
        }

        it('reports a handled slash dispatch with its route and no fallback', async () => {
            const published = await dispatchedFor(
                `
                import { SlashHandler, SlashRoute } from '${seedcordPath}';

                @SlashRoute('ok')
                export class OkHandler extends SlashHandler<'ok'> {
                    public async execute() {
                        await this.event.reply('done');
                    }
                }
                `,
                'ok'
            );

            expect(published).toHaveLength(1);
            expect(published[0]).toMatchObject({
                routeId: 'slash:ok',
                interactionId: 'i1',
                kind: 'slash',
                outcome: 'handled',
                fallback: false
            });
        });

        it('reports refused when a gate stops the handler', async () => {
            const published = await dispatchedFor(
                `
                import { Gated, OwnerOnly, SlashHandler, SlashRoute } from '${seedcordPath}';

                @Gated(OwnerOnly())
                @SlashRoute('guarded')
                export class GuardedHandler extends SlashHandler<'guarded'> {
                    public async execute() {
                        await this.event.reply('done');
                    }
                }
                `,
                'guarded'
            );

            expect(published).toHaveLength(1);
            expect(published[0]).toMatchObject({ routeId: 'slash:guarded', outcome: 'refused' });
        });

        it('reports refused when the handler throws a Silence, which is a deliberate stop', async () => {
            const published = await dispatchedFor(
                `
                import { Silence, SlashHandler, SlashRoute } from '${seedcordPath}';

                @SlashRoute('silent')
                export class SilentHandler extends SlashHandler<'silent'> {
                    public async execute() {
                        throw new Silence('blacklisted');
                    }
                }
                `,
                'silent'
            );

            expect(published).toHaveLength(1);
            expect(published[0]).toMatchObject({ routeId: 'slash:silent', outcome: 'refused' });
        });

        it('reports failed when a gate throws a reporting Fault, since the gate itself broke', async () => {
            const published = await dispatchedFor(
                `
                import { defineGate, Fault, Gated, SlashHandler, SlashRoute } from '${seedcordPath}';

                const Broken = defineGate('Broken', () => {
                    throw new Fault({ cause: new Error('permission lookup failed') });
                });

                @Gated(Broken)
                @SlashRoute('brokengate')
                export class BrokenGateHandler extends SlashHandler<'brokengate'> {
                    public async execute() {
                        await this.event.reply('done');
                    }
                }
                `,
                'brokengate'
            );

            expect(published).toHaveLength(1);
            expect(published[0]).toMatchObject({ routeId: 'slash:brokengate', outcome: 'failed' });
        });

        it('reports failed when the handler throws', async () => {
            const published = await dispatchedFor(
                `
                import { SlashHandler, SlashRoute } from '${seedcordPath}';

                @SlashRoute('boom')
                export class BoomHandler extends SlashHandler<'boom'> {
                    public async execute() {
                        throw new Error('handler exploded');
                    }
                }
                `,
                'boom'
            );

            expect(published).toHaveLength(1);
            expect(published[0]).toMatchObject({ routeId: 'slash:boom', outcome: 'failed' });
        });

        it('flags the unhandled default as a fallback and keys the route by kind', async () => {
            const published = await dispatchedFor(
                `
                import { SlashHandler, SlashRoute } from '${seedcordPath}';

                @SlashRoute('registered')
                export class RegisteredHandler extends SlashHandler<'registered'> {
                    public async execute() {
                        await this.event.reply('done');
                    }
                }
                `,
                'unregistered'
            );

            expect(published).toHaveLength(1);
            expect(published[0]).toMatchObject({ routeId: 'slash:unregistered', fallback: true });
        });

        // refused means a gate stopped the dispatch, so every other pre-handler throw reports failed
        it('reports failed when a middleware throws before the handler is built', async () => {
            const published = await dispatchedFor(
                `
                import { SlashHandler, SlashRoute } from '${seedcordPath}';

                @SlashRoute('mwboom')
                export class MwBoomHandler extends SlashHandler<'mwboom'> {
                    public async execute() {
                        await this.event.reply('done');
                    }
                }
                `,
                'mwboom',
                `
                import { InteractionMiddleware, Middleware, MiddlewareType } from '${seedcordPath}';

                @Middleware(MiddlewareType.Interaction)
                export class BoomMiddleware extends InteractionMiddleware {
                    public async execute() {
                        throw new Error('middleware exploded');
                    }
                }
                `
            );

            expect(published).toHaveLength(1);
            expect(published[0]).toMatchObject({ routeId: 'slash:mwboom', outcome: 'failed' });
        });

        // a hand-built customId carries no colon, so prefixOf returns '' and no route can match
        it('replies to a customId that carries no route prefix through the unhandled default', async () => {
            await testEnv.createDir('interactions');
            const config = testConfig({ interactions: testEnv.resolvePath('interactions') });

            seedcord = new Seedcord(config);
            const controller = controllerOf(seedcord);
            await controller.init();

            const published: SubscriptionData<'interactionDispatched'>[] = [];
            seedcord.bus.on('interactionDispatched', (payload) => published.push(payload));

            const interaction = { ...fakeSlash('unused'), customId: 'vote', isChatInputCommand: () => false };
            await controller.handleButton(interaction);

            expect(interaction.reply).toHaveBeenCalledTimes(1);
            expect(published).toHaveLength(1);
            expect(published[0]).toMatchObject({ kind: 'button', fallback: true });
        });

        // the production buildSender wiring, so dropping core.bus from RepliableHandler fails here
        it('publishes responseAttempted from the handler own reply, carrying the route id', async () => {
            await testEnv.createFile(
                'interactions/Route.ts',
                `
                import { SlashHandler, SlashRoute } from '${seedcordPath}';

                @SlashRoute('replied')
                export class RepliedHandler extends SlashHandler<'replied'> {
                    public async execute() {
                        await this.reply('done');
                    }
                }
                `
            );
            const config = testConfig({ interactions: testEnv.resolvePath('interactions') });

            seedcord = new Seedcord(config);
            const controller = controllerOf(seedcord);
            await controller.init();

            const sent: SubscriptionData<'responseAttempted'>[] = [];
            seedcord.bus.on('responseAttempted', (payload) => sent.push(payload));

            await controller.handleSlashCommand(fakeSlash('replied'));

            expect(sent).toHaveLength(1);
            expect(sent[0]).toMatchObject({
                routeId: 'slash:replied',
                method: 'reply',
                outcome: 'sent',
                interactionId: 'i1'
            });
        });

        // the type-based rule is the same on both transports, so a constructor Silence matches http
        it('reports refused when the handler constructor throws a Silence', async () => {
            const published = await dispatchedFor(
                `
                import { Silence, SlashHandler, SlashRoute } from '${seedcordPath}';

                @SlashRoute('ctorsilent')
                export class CtorSilentHandler extends SlashHandler<'ctorsilent'> {
                    constructor(...args) {
                        super(...args);
                        throw new Silence('blocked');
                    }

                    public async execute() {
                        await this.event.reply('done');
                    }
                }
                `,
                'ctorsilent'
            );

            expect(published).toHaveLength(1);
            expect(published[0]).toMatchObject({ routeId: 'slash:ctorsilent', outcome: 'refused' });
        });

        // a raw non-Error gate throw is user error, the framework reports it and lets it reach the root
        it('reports failed once when a gate throws a value that is not an Error', async () => {
            await testEnv.createFile(
                'interactions/Route.ts',
                `
                import { defineGate, Gated, SlashHandler, SlashRoute } from '${seedcordPath}';

                const Raw = defineGate('Raw', () => {
                    throw 'blocked';
                });

                @Gated(Raw)
                @SlashRoute('rawgate')
                export class RawGateHandler extends SlashHandler<'rawgate'> {
                    public async execute() {
                        await this.event.reply('done');
                    }
                }
                `
            );
            const config = testConfig({ interactions: testEnv.resolvePath('interactions') });

            seedcord = new Seedcord(config);
            const controller = controllerOf(seedcord);
            await controller.init();

            const published: SubscriptionData<'interactionDispatched'>[] = [];
            seedcord.bus.on('interactionDispatched', (payload) => published.push(payload));

            await expect(controller.handleSlashCommand(fakeSlash('rawgate'))).rejects.toBe('blocked');

            expect(published).toHaveLength(1);
            expect(published[0]).toMatchObject({ routeId: 'slash:rawgate', outcome: 'failed' });
        });

        it('reports failed when the handler constructor throws', async () => {
            const published = await dispatchedFor(
                `
                import { SlashHandler, SlashRoute } from '${seedcordPath}';

                @SlashRoute('ctorboom')
                export class CtorBoomHandler extends SlashHandler<'ctorboom'> {
                    constructor(...args) {
                        super(...args);
                        throw new Error('ctor exploded');
                    }

                    public async execute() {
                        await this.event.reply('done');
                    }
                }
                `,
                'ctorboom'
            );

            expect(published).toHaveLength(1);
            expect(published[0]).toMatchObject({ routeId: 'slash:ctorboom', outcome: 'failed' });
        });
    });
});
