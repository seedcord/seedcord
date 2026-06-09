import { SeedcordErrorCode } from '@seedcord/services';
import { SlashCommandBuilder } from 'discord.js';
import { describe, it, expect } from 'vitest';

import { SlashTableGenerator } from '@commands/codegen/SlashTableGenerator';

import type { SlashTables } from '@commands/codegen/SlashTableGenerator';
import type { ILogger } from '@seedcord/types';
import type { RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord.js';

const silentLogger: ILogger = {
    error: () => undefined,
    warn: () => undefined,
    info: () => undefined,
    http: () => undefined,
    verbose: () => undefined,
    debug: () => undefined,
    silly: () => undefined
};

function tablesFor(...commands: { toJSON: () => RESTPostAPIChatInputApplicationCommandsJSONBody }[]): SlashTables {
    return new SlashTableGenerator(silentLogger).generate(
        commands.map((command, index) => ({ sourceFile: `command-${index}.ts`, json: command.toJSON() }))
    );
}

describe('SlashTableGenerator', () => {
    it('builds a flat command into one route with its option table', () => {
        const tables = tablesFor(
            new SlashCommandBuilder()
                .setName('ban')
                .setDescription('Ban a member')
                .addUserOption((o) => o.setName('target').setDescription('Who to ban').setRequired(true))
                .addStringOption((o) => o.setName('reason').setDescription('Why'))
        );

        expect(tables).toEqual({
            ban: {
                target: { kind: 'user', required: true },
                reason: { kind: 'string', required: false }
            }
        });
    });

    it('builds subcommands and groups into leaves with no root route', () => {
        const tables = tablesFor(
            new SlashCommandBuilder()
                .setName('demo')
                .setDescription('subs')
                .addSubcommand((sc) =>
                    sc
                        .setName('setup')
                        .setDescription('d')
                        .addChannelOption((o) => o.setName('channel').setDescription('d').setRequired(true))
                )
                .addSubcommandGroup((g) =>
                    g
                        .setName('admin')
                        .setDescription('d')
                        .addSubcommand((sc) =>
                            sc
                                .setName('reset')
                                .setDescription('d')
                                .addUserOption((o) => o.setName('target').setDescription('d').setRequired(true))
                        )
                )
        );

        expect(tables).toEqual({
            'demo/setup': { channel: { kind: 'channel', required: true } },
            'demo/admin/reset': { target: { kind: 'user', required: true } }
        });
    });

    it('captures choice values for string and integer options', () => {
        const tables = tablesFor(
            new SlashCommandBuilder()
                .setName('config')
                .setDescription('d')
                .addStringOption((o) =>
                    o
                        .setName('scope')
                        .setDescription('d')
                        .setRequired(true)
                        .addChoices({ name: 'Guild', value: 'guild' }, { name: 'Global', value: 'global' })
                )
                .addIntegerOption((o) =>
                    o
                        .setName('level')
                        .setDescription('d')
                        .addChoices({ name: 'Low', value: 1 }, { name: 'High', value: 2 })
                )
        );

        expect(tables).toEqual({
            config: {
                scope: { kind: 'string', required: true, choices: ['guild', 'global'] },
                level: { kind: 'integer', required: false, choices: [1, 2] }
            }
        });
    });

    it('throws naming both source files when two commands resolve to the same route', () => {
        const generator = new SlashTableGenerator(silentLogger);
        const commands = [
            {
                sourceFile: 'commands/ban.ts',
                json: new SlashCommandBuilder().setName('ban').setDescription('a').toJSON()
            },
            {
                sourceFile: 'commands/mod/ban.ts',
                json: new SlashCommandBuilder().setName('ban').setDescription('b').toJSON()
            }
        ];

        let caught: unknown;
        try {
            generator.generate(commands);
        } catch (error: unknown) {
            caught = error;
        }

        expect(caught).toMatchObject({ code: SeedcordErrorCode.CliCodegenDuplicateRoute });
        const message = (caught as Error).message;
        expect(message).toContain('ban');
        expect(message).toContain('commands/ban.ts');
        expect(message).toContain('commands/mod/ban.ts');
    });

    it('warns and emits no leaf for an undeployable empty subcommand group', () => {
        const warnings: string[] = [];
        const logger: ILogger = { ...silentLogger, warn: (message) => warnings.push(String(message)) };
        const json = new SlashCommandBuilder()
            .setName('admin')
            .setDescription('d')
            .addSubcommandGroup((g) => g.setName('empty').setDescription('gd'))
            .addSubcommand((sc) => sc.setName('ping').setDescription('pd'))
            .toJSON();

        const tables = new SlashTableGenerator(logger).generate([{ sourceFile: 'admin.ts', json }]);

        expect(tables).toEqual({ 'admin/ping': {} });
        expect(warnings.some((warning) => warning.includes('admin/empty'))).toBe(true);
    });

    it('emits a route with an empty option table for a command with no options', () => {
        expect(tablesFor(new SlashCommandBuilder().setName('ping').setDescription('Pong'))).toEqual({ ping: {} });
    });
});
