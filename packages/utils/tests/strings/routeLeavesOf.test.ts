import { SlashCommandBuilder } from 'discord.js';
import { describe, expect, it } from 'vitest';

import { routeLeavesOf } from '../../src/strings/routeLeavesOf';

import type { RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord-api-types/v10';

const routesOf = (json: RESTPostAPIChatInputApplicationCommandsJSONBody): string[] =>
    routeLeavesOf(json).map((leaf) => leaf.route);

describe('routeLeavesOf', () => {
    it('returns one leaf at the command name for a flat command with no options', () => {
        const json = new SlashCommandBuilder().setName('ping').setDescription('d').toJSON();
        expect(routesOf(json)).toEqual(['ping']);
    });

    it('carries the basic options of a flat command through on its single leaf', () => {
        const json = new SlashCommandBuilder()
            .setName('ban')
            .setDescription('d')
            .addStringOption((o) => o.setName('reason').setDescription('d'))
            .toJSON();

        const leaves = routeLeavesOf(json);
        expect(leaves).toHaveLength(1);
        expect(leaves[0]?.route).toBe('ban');
        expect(leaves[0]?.options.map((option) => option.name)).toEqual(['reason']);
    });

    it('keys a bare subcommand as command/subcommand', () => {
        const json = new SlashCommandBuilder()
            .setName('config')
            .setDescription('d')
            .addSubcommand((s) => s.setName('set').setDescription('d'))
            .toJSON();

        expect(routesOf(json)).toEqual(['config/set']);
    });

    it('emits one leaf per subcommand in builder order', () => {
        const json = new SlashCommandBuilder()
            .setName('config')
            .setDescription('d')
            .addSubcommand((s) => s.setName('set').setDescription('d'))
            .addSubcommand((s) => s.setName('get').setDescription('d'))
            .toJSON();

        expect(routesOf(json)).toEqual(['config/set', 'config/get']);
    });

    it('keys a grouped subcommand as command/group/subcommand', () => {
        const json = new SlashCommandBuilder()
            .setName('admin')
            .setDescription('d')
            .addSubcommandGroup((g) =>
                g
                    .setName('roles')
                    .setDescription('d')
                    .addSubcommand((s) => s.setName('add').setDescription('d'))
            )
            .toJSON();

        expect(routesOf(json)).toEqual(['admin/roles/add']);
    });

    it('carries the options of a subcommand leaf through', () => {
        const json = new SlashCommandBuilder()
            .setName('config')
            .setDescription('d')
            .addSubcommand((s) =>
                s
                    .setName('set')
                    .setDescription('d')
                    .addStringOption((o) => o.setName('key').setDescription('d'))
            )
            .toJSON();

        const leaves = routeLeavesOf(json);
        expect(leaves[0]?.route).toBe('config/set');
        expect(leaves[0]?.options.map((option) => option.name)).toEqual(['key']);
    });

    it('yields no leaf for a subcommand group with no subcommands', () => {
        const json = new SlashCommandBuilder()
            .setName('admin')
            .setDescription('d')
            .addSubcommandGroup((g) => g.setName('empty').setDescription('d'))
            .toJSON();

        expect(routesOf(json)).toEqual([]);
    });

    it('walks a command that mixes a bare subcommand and a populated group', () => {
        const json = new SlashCommandBuilder()
            .setName('mod')
            .setDescription('d')
            .addSubcommand((s) => s.setName('ban').setDescription('d'))
            .addSubcommandGroup((g) =>
                g
                    .setName('roles')
                    .setDescription('d')
                    .addSubcommand((s) => s.setName('add').setDescription('d'))
                    .addSubcommand((s) => s.setName('remove').setDescription('d'))
            )
            .toJSON();

        expect(routesOf(json)).toEqual(['mod/ban', 'mod/roles/add', 'mod/roles/remove']);
    });
});
