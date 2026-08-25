import { SlashCommandBuilder, ChannelType } from 'discord.js';
import { describe, it, expect } from 'vitest';

import { AugmentationBuilder } from '#commands/codegen/AugmentationBuilder';

import { silentLogger } from '../silentLogger';

import type { RouteOptions } from '#commands/codegen/AugmentationBuilder';
import type { RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';

function tablesFor(
    ...commands: { toJSON: () => RESTPostAPIApplicationCommandsJSONBody }[]
): Record<string, RouteOptions> {
    const { slash } = new AugmentationBuilder(silentLogger).generate(
        commands.map((command, index) => ({ sourceFile: `command-${index}.ts`, json: command.toJSON() })),
        {}
    );

    return Object.fromEntries(Object.entries(slash).map(([route, row]) => [route, row.options]));
}

describe('AugmentationBuilder channelTypes', () => {
    it('captures declared channel_types sorted ascending and omits the key when none are declared', () => {
        const tables = tablesFor(
            new SlashCommandBuilder()
                .setName('move')
                .setDescription('d')
                .addChannelOption((o) =>
                    o
                        .setName('dest')
                        .setDescription('d')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildAnnouncement, ChannelType.GuildText)
                )
                .addChannelOption((o) => o.setName('any').setDescription('d'))
        );

        expect(tables).toEqual({
            move: {
                dest: {
                    kind: 'channel',
                    required: true,
                    channelTypes: [ChannelType.GuildText, ChannelType.GuildAnnouncement]
                },
                any: { kind: 'channel', required: false }
            }
        });
        expect(tables.move?.any).not.toHaveProperty('channelTypes');
    });
});
