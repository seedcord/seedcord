import { SlashCommandBuilder, ChannelType } from 'discord.js';
import { describe, it, expect } from 'vitest';

import { AugmentationBuilder } from '@commands/codegen/AugmentationBuilder';

import type { SlashTables } from '@commands/codegen/AugmentationBuilder';
import type { ILogger } from '@seedcord/types';
import type { RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';

const silentLogger: ILogger = {
    error: () => undefined,
    warn: () => undefined,
    info: () => undefined,
    http: () => undefined,
    verbose: () => undefined,
    debug: () => undefined,
    silly: () => undefined
};

function tablesFor(...commands: { toJSON: () => RESTPostAPIApplicationCommandsJSONBody }[]): SlashTables {
    return new AugmentationBuilder(silentLogger).generate(
        commands.map((command, index) => ({ sourceFile: `command-${index}.ts`, json: command.toJSON() })),
        {}
    ).slash;
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
