import { ContextMenuCommandBuilder, SlashCommandBuilder } from '@discordjs/builders';
import { ApplicationCommandType } from 'discord-api-types/v10';
import { describe, expect, it } from 'vitest';

import { contextMenuLeaves } from '#src/commands/contextMenuLeaves';

describe('contextMenuLeaves', () => {
    it('splits the context-menu names by kind and skips the slash commands', () => {
        const leaves = contextMenuLeaves(
            [
                new ContextMenuCommandBuilder().setName('Report').setType(ApplicationCommandType.Message),
                new ContextMenuCommandBuilder().setName('Profile').setType(ApplicationCommandType.User),
                new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!')
            ].map((command) => command.toJSON())
        );

        expect([...leaves.message]).toEqual(['Report']);
        expect([...leaves.user]).toEqual(['Profile']);
    });
});
