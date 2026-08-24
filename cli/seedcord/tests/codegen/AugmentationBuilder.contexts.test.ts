import { InteractionContextType, SlashCommandBuilder } from 'discord.js';
import { describe, expect, it } from 'vitest';

import { AugmentationBuilder } from '#commands/codegen/AugmentationBuilder';

import { silentLogger } from '../silentLogger';

import type { SlashRouteRow } from '#commands/codegen/AugmentationBuilder';
import type { RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';

function cacheFor(
    ...commands: { toJSON: () => RESTPostAPIApplicationCommandsJSONBody }[]
): Record<string, SlashRouteRow['cache']> {
    const { slash } = new AugmentationBuilder(silentLogger).generate(
        commands.map((command, index) => ({ sourceFile: `command-${index}.ts`, json: command.toJSON() })),
        {}
    );

    return Object.fromEntries(Object.entries(slash).map(([route, row]) => [route, row.cache]));
}

const command = (name: string): SlashCommandBuilder => new SlashCommandBuilder().setName(name).setDescription('d');

describe('AugmentationBuilder contexts', () => {
    it('reads a guild-only command as cached', () => {
        const cache = cacheFor(command('ban').setContexts(InteractionContextType.Guild));

        expect(cache).toStrictEqual({ ban: 'cached' });
    });

    it('reads a command a DM can reach as uncached', () => {
        const cache = cacheFor(command('help').setContexts(InteractionContextType.Guild, InteractionContextType.BotDM));

        expect(cache).toStrictEqual({ help: undefined });
    });

    it('reads a command with no guild context as uncached', () => {
        const cache = cacheFor(command('dmonly').setContexts(InteractionContextType.BotDM));

        expect(cache).toStrictEqual({ dmonly: undefined });
    });

    it('gives every subcommand leaf the parent contexts', () => {
        const cache = cacheFor(
            command('config')
                .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM)
                .addSubcommand((sc) => sc.setName('set').setDescription('d'))
                .addSubcommand((sc) => sc.setName('get').setDescription('d'))
        );

        expect(cache).toStrictEqual({ 'config/set': undefined, 'config/get': undefined });
    });
});
