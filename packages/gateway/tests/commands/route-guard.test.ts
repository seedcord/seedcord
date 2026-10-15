import { type MockInstance, describe, expect, afterEach, vi } from 'vitest';

import { commandRegistryOf, interactionsOf } from '#bot/Bot';
import { Seedcord } from '#src/Seedcord';
import { seedcordPath } from '#tests/utils/source-path';
import { testConfig } from '#tests/utils/test-config';
import { it } from '#tests/utils/test-env';

type Interactions = NonNullable<ReturnType<typeof interactionsOf>>;

// justified: the warnings go through the dispatcher's private logger
function loggerOf(interactions: Interactions): { warn: (message: string) => void } {
    return (interactions as unknown as { logger: { warn: (message: string) => void } }).logger;
}

async function deployWarnings(instance: Seedcord): Promise<MockInstance<(message: string) => void>> {
    const registry = commandRegistryOf(instance.bot);
    const interactions = interactionsOf(instance.bot);
    if (!registry || !interactions) throw new Error('this test config declares commands and interactions');
    await interactions.init();
    const warnSpy = vi.spyOn(loggerOf(interactions), 'warn');
    await registry.deploy(new AbortController().signal, { routes: interactions });
    return warnSpy;
}

describe('Boot-time slash route exhaustiveness guard', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('warns for a command route leaf with no handler and stays silent for the handled leaf', async ({ testEnv }) => {
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

        await using seedcord = new Seedcord(config);
        const warnSpy = await deployWarnings(seedcord);

        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('config/get'));
        expect(warnSpy.mock.calls.every((call) => !String(call[0]).includes('config/set'))).toBe(true);
    });

    it('stays silent when every command route leaf has a handler', async ({ testEnv }) => {
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

        await using seedcord = new Seedcord(config);
        const warnSpy = await deployWarnings(seedcord);

        expect(warnSpy).not.toHaveBeenCalled();
    });
});
