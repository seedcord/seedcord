import { SeedcordErrorCode } from '@seedcord/errors';
import { SlashCommandBuilder, ContextMenuCommandBuilder, ApplicationCommandType } from 'discord.js';
import { describe, it, expect } from 'vitest';

import { AugmentationBuilder } from '#commands/codegen/AugmentationBuilder';

import { silentLogger } from '../silentLogger';

import type { SlashTables } from '#commands/codegen/AugmentationBuilder';
import type { ILogger } from '@seedcord/types';
import type { RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';

function tablesFor(...commands: { toJSON: () => RESTPostAPIApplicationCommandsJSONBody }[]): SlashTables {
    return new AugmentationBuilder(silentLogger).generate(
        commands.map((command, index) => ({ sourceFile: `command-${index}.ts`, json: command.toJSON() })),
        {}
    ).slash;
}

describe('AugmentationBuilder', () => {
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

    it('captures the autocomplete flag on string, integer, and number options and omits it elsewhere', () => {
        const tables = tablesFor(
            new SlashCommandBuilder()
                .setName('search')
                .setDescription('d')
                .addStringOption((o) => o.setName('query').setDescription('d').setRequired(true).setAutocomplete(true))
                .addIntegerOption((o) => o.setName('limit').setDescription('d').setAutocomplete(true))
                .addNumberOption((o) => o.setName('ratio').setDescription('d').setAutocomplete(true))
                .addStringOption((o) => o.setName('plain').setDescription('d'))
        );

        expect(tables).toEqual({
            search: {
                query: { kind: 'string', required: true, autocomplete: true },
                limit: { kind: 'integer', required: false, autocomplete: true },
                ratio: { kind: 'number', required: false, autocomplete: true },
                plain: { kind: 'string', required: false }
            }
        });
        expect(tables.search?.plain).not.toHaveProperty('autocomplete');
    });

    it('throws naming both source files when two commands resolve to the same route', () => {
        const generator = new AugmentationBuilder(silentLogger);
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
            generator.generate(commands, {});
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

        const { slash } = new AugmentationBuilder(logger).generate([{ sourceFile: 'admin.ts', json }], {});

        expect(slash).toEqual({ 'admin/ping': {} });
        expect(warnings.some((warning) => warning.includes('admin/empty'))).toBe(true);
    });

    it('emits a route with an empty option table for a command with no options', () => {
        expect(tablesFor(new SlashCommandBuilder().setName('ping').setDescription('Pong'))).toEqual({ ping: {} });
    });

    it('maps all nine option kinds to the right OptionKind in builder order', () => {
        const tables = tablesFor(
            new SlashCommandBuilder()
                .setName('kinds')
                .setDescription('d')
                .addStringOption((o) => o.setName('s').setDescription('d'))
                .addIntegerOption((o) => o.setName('i').setDescription('d'))
                .addNumberOption((o) => o.setName('n').setDescription('d'))
                .addBooleanOption((o) => o.setName('b').setDescription('d'))
                .addUserOption((o) => o.setName('u').setDescription('d'))
                .addChannelOption((o) => o.setName('c').setDescription('d'))
                .addRoleOption((o) => o.setName('r').setDescription('d'))
                .addMentionableOption((o) => o.setName('m').setDescription('d'))
                .addAttachmentOption((o) => o.setName('a').setDescription('d'))
        );

        expect(tables).toEqual({
            kinds: {
                s: { kind: 'string', required: false },
                i: { kind: 'integer', required: false },
                n: { kind: 'number', required: false },
                b: { kind: 'boolean', required: false },
                u: { kind: 'user', required: false },
                c: { kind: 'channel', required: false },
                r: { kind: 'role', required: false },
                m: { kind: 'mentionable', required: false },
                a: { kind: 'attachment', required: false }
            }
        });

        // builder order, not alphabetized
        expect(Object.keys(tables.kinds ?? {})).toEqual(['s', 'i', 'n', 'b', 'u', 'c', 'r', 'm', 'a']);
    });

    it('records required:true for required options and required:false for optional ones across kinds', () => {
        const tables = tablesFor(
            new SlashCommandBuilder()
                .setName('req')
                .setDescription('d')
                .addStringOption((o) => o.setName('rs').setDescription('d').setRequired(true))
                .addStringOption((o) => o.setName('os').setDescription('d'))
                .addIntegerOption((o) => o.setName('ri').setDescription('d').setRequired(true))
                .addBooleanOption((o) => o.setName('ob').setDescription('d'))
                .addUserOption((o) => o.setName('ru').setDescription('d').setRequired(true))
        );

        expect(tables).toEqual({
            req: {
                rs: { kind: 'string', required: true },
                os: { kind: 'string', required: false },
                ri: { kind: 'integer', required: true },
                ob: { kind: 'boolean', required: false },
                ru: { kind: 'user', required: true }
            }
        });
    });

    it('captures number choices as float values', () => {
        const tables = tablesFor(
            new SlashCommandBuilder()
                .setName('rate')
                .setDescription('d')
                .addNumberOption((o) =>
                    o
                        .setName('factor')
                        .setDescription('d')
                        .setRequired(true)
                        .addChoices({ name: 'Half', value: 0.5 }, { name: 'Full', value: 1 })
                )
        );

        expect(tables).toEqual({
            rate: {
                factor: { kind: 'number', required: true, choices: [0.5, 1] }
            }
        });
    });

    it('omits the choices key entirely for an option with no choices', () => {
        const tables = tablesFor(
            new SlashCommandBuilder()
                .setName('plain')
                .setDescription('d')
                .addStringOption((o) => o.setName('text').setDescription('d'))
        );

        expect(tables.plain?.text).not.toHaveProperty('choices');
        expect(tables).toEqual({ plain: { text: { kind: 'string', required: false } } });
    });

    it('builds a bare subcommand into a cmd/sub leaf with no root route', () => {
        const tables = tablesFor(
            new SlashCommandBuilder()
                .setName('cfg')
                .setDescription('d')
                .addSubcommand((sc) =>
                    sc
                        .setName('show')
                        .setDescription('d')
                        .addBooleanOption((o) => o.setName('verbose').setDescription('d'))
                )
        );

        expect(tables).toEqual({
            'cfg/show': { verbose: { kind: 'boolean', required: false } }
        });
        expect(tables).not.toHaveProperty('cfg');
    });

    it('builds a subcommand group into a cmd/group/sub leaf', () => {
        const tables = tablesFor(
            new SlashCommandBuilder()
                .setName('role')
                .setDescription('d')
                .addSubcommandGroup((g) =>
                    g
                        .setName('grant')
                        .setDescription('d')
                        .addSubcommand((sc) =>
                            sc
                                .setName('user')
                                .setDescription('d')
                                .addRoleOption((o) => o.setName('role').setDescription('d').setRequired(true))
                        )
                )
        );

        expect(tables).toEqual({
            'role/grant/user': { role: { kind: 'role', required: true } }
        });
    });

    it('emits leaves for both a bare subcommand and a group on the same command', () => {
        const tables = tablesFor(
            new SlashCommandBuilder()
                .setName('cfg')
                .setDescription('d')
                .addSubcommand((sc) =>
                    sc
                        .setName('show')
                        .setDescription('d')
                        .addBooleanOption((o) => o.setName('verbose').setDescription('d'))
                )
                .addSubcommandGroup((g) =>
                    g
                        .setName('set')
                        .setDescription('d')
                        .addSubcommand((sc) =>
                            sc
                                .setName('limit')
                                .setDescription('d')
                                .addIntegerOption((o) => o.setName('n').setDescription('d').setRequired(true))
                        )
                        .addSubcommand((sc) =>
                            sc
                                .setName('mode')
                                .setDescription('d')
                                .addStringOption((o) => o.setName('m').setDescription('d'))
                        )
                )
        );

        expect(tables).toEqual({
            'cfg/show': { verbose: { kind: 'boolean', required: false } },
            'cfg/set/limit': { n: { kind: 'integer', required: true } },
            'cfg/set/mode': { m: { kind: 'string', required: false } }
        });
        expect(tables).not.toHaveProperty('cfg');
    });

    it('emits a leaf per subcommand across multiple groups', () => {
        const tables = tablesFor(
            new SlashCommandBuilder()
                .setName('role')
                .setDescription('d')
                .addSubcommandGroup((g) =>
                    g
                        .setName('add')
                        .setDescription('d')
                        .addSubcommand((sc) => sc.setName('user').setDescription('d'))
                )
                .addSubcommandGroup((g) =>
                    g
                        .setName('remove')
                        .setDescription('d')
                        .addSubcommand((sc) => sc.setName('user').setDescription('d'))
                )
        );

        expect(tables).toEqual({
            'role/add/user': {},
            'role/remove/user': {}
        });
    });

    it('emits an empty option table for a subcommand with no options', () => {
        const tables = tablesFor(
            new SlashCommandBuilder()
                .setName('demo')
                .setDescription('d')
                .addSubcommand((sc) => sc.setName('noop').setDescription('d'))
        );

        expect(tables).toEqual({ 'demo/noop': {} });
    });

    it('warns naming the group and emits no leaf for an empty group while keeping a sibling sub', () => {
        const warnings: string[] = [];
        const logger: ILogger = { ...silentLogger, warn: (message) => warnings.push(String(message)) };
        const json = new SlashCommandBuilder()
            .setName('admin')
            .setDescription('d')
            .addSubcommandGroup((g) => g.setName('empty').setDescription('gd'))
            .addSubcommand((sc) => sc.setName('ping').setDescription('pd'))
            .toJSON();

        const { slash } = new AugmentationBuilder(logger).generate([{ sourceFile: 'admin.ts', json }], {});

        expect(slash).toEqual({ 'admin/ping': {} });
        expect(slash).not.toHaveProperty('admin/empty');
        expect(warnings.some((warning) => warning.includes('admin/empty'))).toBe(true);
    });

    it('throws CliCodegenDuplicateRoute naming both files when a flat command and a group leaf collide', () => {
        const generator = new AugmentationBuilder(silentLogger);
        const commands = [
            {
                sourceFile: 'commands/role-add-user.ts',
                json: new SlashCommandBuilder()
                    .setName('role')
                    .setDescription('a')
                    .addSubcommandGroup((g) =>
                        g
                            .setName('add')
                            .setDescription('d')
                            .addSubcommand((sc) => sc.setName('user').setDescription('d'))
                    )
                    .toJSON()
            },
            {
                sourceFile: 'commands/dup.ts',
                json: new SlashCommandBuilder()
                    .setName('role')
                    .setDescription('b')
                    .addSubcommandGroup((g) =>
                        g
                            .setName('add')
                            .setDescription('d')
                            .addSubcommand((sc) => sc.setName('user').setDescription('d'))
                    )
                    .toJSON()
            }
        ];

        let caught: unknown;
        try {
            generator.generate(commands, {});
        } catch (error: unknown) {
            caught = error;
        }

        expect(caught).toMatchObject({ code: SeedcordErrorCode.CliCodegenDuplicateRoute });
        const message = (caught as Error).message;
        expect(message).toContain('role/add/user');
        expect(message).toContain('commands/role-add-user.ts');
        expect(message).toContain('commands/dup.ts');
    });

    it('collects user and message context menus into their own sets, never as slash routes', () => {
        const view = new ContextMenuCommandBuilder().setName('View Profile').setType(ApplicationCommandType.User);
        const report = new ContextMenuCommandBuilder()
            .setName('Report Message')
            .setType(ApplicationCommandType.Message);

        const registry = new AugmentationBuilder(silentLogger).generate(
            [
                { sourceFile: 'view.ts', json: view.toJSON() },
                { sourceFile: 'report.ts', json: report.toJSON() }
            ],
            {}
        );

        expect(registry.slash).toEqual({});
        expect(registry.userContextMenus).toEqual(['View Profile']);
        expect(registry.messageContextMenus).toEqual(['Report Message']);
    });

    it('allows a user command and a message command to share a name', () => {
        const userReport = new ContextMenuCommandBuilder().setName('Report').setType(ApplicationCommandType.User);
        const messageReport = new ContextMenuCommandBuilder().setName('Report').setType(ApplicationCommandType.Message);

        const registry = new AugmentationBuilder(silentLogger).generate(
            [
                { sourceFile: 'user-report.ts', json: userReport.toJSON() },
                { sourceFile: 'message-report.ts', json: messageReport.toJSON() }
            ],
            {}
        );

        expect(registry.userContextMenus).toEqual(['Report']);
        expect(registry.messageContextMenus).toEqual(['Report']);
    });

    it('throws naming both files when two user context menus share a name', () => {
        const generator = new AugmentationBuilder(silentLogger);
        const commands = [
            {
                sourceFile: 'commands/view-a.ts',
                json: new ContextMenuCommandBuilder()
                    .setName('View Profile')
                    .setType(ApplicationCommandType.User)
                    .toJSON()
            },
            {
                sourceFile: 'commands/view-b.ts',
                json: new ContextMenuCommandBuilder()
                    .setName('View Profile')
                    .setType(ApplicationCommandType.User)
                    .toJSON()
            }
        ];

        let caught: unknown;
        try {
            generator.generate(commands, {});
        } catch (error: unknown) {
            caught = error;
        }

        expect(caught).toMatchObject({ code: SeedcordErrorCode.CliCodegenDuplicateContextMenu });
        const message = (caught as Error).message;
        expect(message).toContain('user');
        expect(message).toContain('View Profile');
        expect(message).toContain('commands/view-a.ts');
        expect(message).toContain('commands/view-b.ts');
    });

    it('throws naming both files when two message context menus share a name', () => {
        const generator = new AugmentationBuilder(silentLogger);
        const commands = [
            {
                sourceFile: 'commands/report-a.ts',
                json: new ContextMenuCommandBuilder().setName('Report').setType(ApplicationCommandType.Message).toJSON()
            },
            {
                sourceFile: 'commands/report-b.ts',
                json: new ContextMenuCommandBuilder().setName('Report').setType(ApplicationCommandType.Message).toJSON()
            }
        ];

        let caught: unknown;
        try {
            generator.generate(commands, {});
        } catch (error: unknown) {
            caught = error;
        }

        expect(caught).toMatchObject({ code: SeedcordErrorCode.CliCodegenDuplicateContextMenu });
        expect((caught as Error).message).toContain('message');
    });
});
