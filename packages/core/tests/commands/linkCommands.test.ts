import { SlashCommandBuilder } from '@discordjs/builders';
import { ApplicationCommandType } from 'discord-api-types/v10';
import { describe, expect, it } from 'vitest';

import { linkCommands } from '#src/commands/linkCommands';
import { deploy, deployed, guildBucket, ping, userMenu, withSubcommand } from '#tests/commands/fixtures';

import type { RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord-api-types/v10';

describe('linkCommands', () => {
    it('links each slash route and context menu to its deployed id', () => {
        const linked = linkCommands(
            deploy(
                deployed([
                    ['1', 'ban'],
                    ['2', 'View Profile', ApplicationCommandType.User]
                ])
            ),
            [withSubcommand().toJSON(), userMenu().toJSON()]
        );

        expect(linked.commands['ban/list']?.mention).toBe('</ban list:1>');
        expect(linked.contextMenus.user['View Profile']?.id).toBe('2');
    });

    it('lists a command deployed to two guilds as multi-guild', () => {
        const buckets = guildBucket('g1', [['1', 'ping']]);
        buckets.set('g2', deployed([['2', 'ping']]));

        const linked = linkCommands(buckets, [ping().toJSON(), ping().toJSON()]);

        expect(linked.multiGuild).toEqual([{ name: 'ping', type: ApplicationCommandType.ChatInput }]);
    });

    it('keeps the routes of two commands that share a name in different guilds', () => {
        const admin = (sub: string): RESTPostAPIChatInputApplicationCommandsJSONBody =>
            new SlashCommandBuilder()
                .setName('admin')
                .setDescription('admin tools')
                .addSubcommand((s) => s.setName(sub).setDescription(sub))
                .toJSON();
        const buckets = guildBucket('g1', [['1', 'admin']]);
        buckets.set('g2', deployed([['2', 'admin']]));

        const linked = linkCommands(buckets, [admin('ban'), admin('audit')]);

        expect(Object.keys(linked.commands).sort()).toEqual(['admin/audit', 'admin/ban']);
    });

    it('lists each deployed command that no command in code matches', () => {
        const linked = linkCommands(
            deploy(
                deployed([
                    ['1', 'ping'],
                    ['2', 'probe']
                ]),
                guildBucket('g1', [['3', 'probe']])
            ),
            [ping().toJSON()]
        );

        expect(linked.notInCode).toEqual([{ name: 'probe', type: ApplicationCommandType.ChatInput }]);
    });
});
