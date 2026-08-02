import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { Seedcord } from '@src/Seedcord';

import { seedcordPath } from '../utils/source-path';
import { testConfig } from '../utils/test-config';
import { TestEnvironment } from '../utils/test-env';

import '../utils/mock-env';

interface GuardBot {
    commands: { init(): Promise<void>; routeLeaves(): Set<string> };
    interactions: {
        init(): Promise<void>;
        warnUnhandledRoutes(commandLeaves: Iterable<string>): void;
        logger: { warn: (message: string) => void };
    };
}

describe('Boot-time slash route exhaustiveness guard', () => {
    let testEnv: TestEnvironment;
    let seedcord: Seedcord;

    beforeEach(async () => {
        // @ts-expect-error: Accessing private method for testing
        Seedcord.reset();
        testEnv = new TestEnvironment('route-guard-test-');
        await testEnv.setup();
    });

    afterEach(async () => {
        await testEnv.teardown();
        vi.clearAllMocks();
    });

    it('warns for a command route leaf with no handler and stays silent for the handled leaf', async () => {
        await testEnv.createFile(
            'commands/Config.ts',
            `
            import { BuilderComponent, RegisterCommand } from '${seedcordPath}';

            @RegisterCommand('global')
            export class ConfigCommand extends BuilderComponent<'command'> {
                constructor() {
                    super('command');
                    this.instance
                        .setName('config')
                        .setDescription('Configure')
                        .addSubcommand((s) => s.setName('set').setDescription('Set'))
                        .addSubcommand((s) => s.setName('get').setDescription('Get'));
                }
            }
            `
        );

        await testEnv.createFile(
            'interactions/ConfigSet.ts',
            `
            import { SlashHandler, SlashRoute } from '${seedcordPath}';

            @SlashRoute('config/set')
            export class ConfigSetHandler extends SlashHandler<'config/set'> {
                public async execute() {
                    await this.event.reply('ok');
                }
            }
            `
        );

        const config = testConfig({
            commands: testEnv.resolvePath('commands'),
            interactions: testEnv.resolvePath('interactions')
        });

        seedcord = new Seedcord(config);
        // justified: the guard and the controllers it reads are private; drive them directly without a login.
        const bot = seedcord.bot as unknown as GuardBot;
        await bot.commands.init();
        await bot.interactions.init();

        const warnSpy = vi.spyOn(bot.interactions.logger, 'warn');
        bot.interactions.warnUnhandledRoutes(bot.commands.routeLeaves());

        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('config/get'));
        expect(warnSpy.mock.calls.every((call) => !String(call[0]).includes('config/set'))).toBe(true);
    });

    it('stays silent when every command route leaf has a handler', async () => {
        await testEnv.createFile(
            'commands/Ping.ts',
            `
            import { BuilderComponent, RegisterCommand } from '${seedcordPath}';

            @RegisterCommand('global')
            export class PingCommand extends BuilderComponent<'command'> {
                constructor() {
                    super('command');
                    this.instance.setName('ping').setDescription('Replies with Pong');
                }
            }
            `
        );

        await testEnv.createFile(
            'interactions/Ping.ts',
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

        const config = testConfig({
            commands: testEnv.resolvePath('commands'),
            interactions: testEnv.resolvePath('interactions')
        });

        seedcord = new Seedcord(config);
        // justified: the guard and the controllers it reads are private; drive them directly without a login.
        const bot = seedcord.bot as unknown as GuardBot;
        await bot.commands.init();
        await bot.interactions.init();

        const warnSpy = vi.spyOn(bot.interactions.logger, 'warn');
        bot.interactions.warnUnhandledRoutes(bot.commands.routeLeaves());

        expect(warnSpy).not.toHaveBeenCalled();
    });
});
