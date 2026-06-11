import { ApplicationCommandType, ContextMenuCommandBuilder, SlashCommandBuilder } from 'discord.js';
import { describe, expect, it } from 'vitest';

import { slashRouteLeaves } from '@bUtilities/miscellaneous/slashRouteLeaves';

const flat = (name: string): SlashCommandBuilder => new SlashCommandBuilder().setName(name).setDescription('d');

describe('slashRouteLeaves', () => {
    it('returns an empty set for no commands', () => {
        expect(slashRouteLeaves([])).toEqual(new Set());
    });

    it('keys a flat command at its name', () => {
        expect(slashRouteLeaves([flat('ping')])).toEqual(new Set(['ping']));
    });

    it('keys each subcommand as command/subcommand', () => {
        // mutate in place so the fixture stays a SlashCommandBuilder, matching how the registry holds it.
        // chaining addSubcommand would narrow the type to SlashCommandSubcommandsOnlyBuilder.
        const config = flat('config');
        config.addSubcommand((s) => s.setName('set').setDescription('d'));
        config.addSubcommand((s) => s.setName('get').setDescription('d'));

        expect(slashRouteLeaves([config])).toEqual(new Set(['config/set', 'config/get']));
    });

    it('keys a grouped subcommand as command/group/subcommand', () => {
        const admin = flat('admin');
        admin.addSubcommandGroup((g) =>
            g
                .setName('roles')
                .setDescription('d')
                .addSubcommand((s) => s.setName('add').setDescription('d'))
        );

        expect(slashRouteLeaves([admin])).toEqual(new Set(['admin/roles/add']));
    });

    it('unions the leaves of every command', () => {
        expect(slashRouteLeaves([flat('ping'), flat('help')])).toEqual(new Set(['ping', 'help']));
    });

    it('deduplicates the same builder appearing more than once', () => {
        // a guild command registered for several guilds is the same builder pushed once per guild.
        const ban = flat('ban');
        expect(slashRouteLeaves([ban, ban, ban])).toEqual(new Set(['ban']));
    });

    it('skips a context-menu command, which has no slash route', () => {
        const report = new ContextMenuCommandBuilder().setName('Report').setType(ApplicationCommandType.Message);
        expect(slashRouteLeaves([report])).toEqual(new Set());
    });

    it('keeps only slash routes when slash and context-menu commands are mixed', () => {
        const report = new ContextMenuCommandBuilder().setName('Report').setType(ApplicationCommandType.Message);
        expect(slashRouteLeaves([flat('ping'), report])).toEqual(new Set(['ping']));
    });
});
