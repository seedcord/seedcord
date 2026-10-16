import { SlashCommandBuilder } from '@discordjs/builders';
import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { ApplicationCommandType } from 'discord-api-types/v10';
import { describe, it, expect, vi } from 'vitest';

import { CommandInjector, Commands, ContextMenus, warnLinks } from '#src/commands/CommandInjector';
import {
    deploy,
    deployed,
    grouped,
    guildBucket,
    messageMenu,
    ping,
    userMenu,
    withSubcommand
} from '#tests/commands/fixtures';

import type { CommandInfo, ContextMenuInfo } from '#src/commands/CommandInjector';
import type { ILogger } from '@seedcord/types';

// justified: SlashRegistry is empty in tests, so runtime values read through a plain record
const commands = Commands as Record<string, CommandInfo>;
const mentionOf = (route: string): string => commands[route]!.mention;

// justified: both context-menu registries are empty in tests, same as above
const userMenus = ContextMenus.user as Record<string, ContextMenuInfo>;
const messageMenus = ContextMenus.message as Record<string, ContextMenuInfo>;

describe('CommandInjector', () => {
    it('links a global command to a clickable mention', () => {
        new CommandInjector().inject(deploy(deployed([['123', 'ping']])), [ping()]);

        expect(mentionOf('ping')).toBe('</ping:123>');
    });

    it('links a grouped leaf with the group in the middle slot', () => {
        new CommandInjector().inject(deploy(deployed([['999', 'mod']])), [grouped()]);

        expect(mentionOf('mod/case/close')).toBe('</mod case close:999>');
    });

    it('links a subcommand leaf to its parent id', () => {
        new CommandInjector().inject(deploy(deployed([['42', 'ban']])), [withSubcommand()]);

        expect(mentionOf('ban/list')).toBe('</ban list:42>');
    });

    it('resolves a single-guild command against that guild id', () => {
        const registry = [ping()];

        new CommandInjector().inject(guildBucket('g1', [['555', 'ping']]), registry);

        expect(mentionOf('ping')).toBe('</ping:555>');
    });

    it('falls back to plain text for a command deployed to two or more guilds', () => {
        const registry = [ping()];
        const buckets = guildBucket('g1', [['1', 'ping']]);
        buckets.set('g2', deployed([['2', 'ping']]));

        new CommandInjector().inject(buckets, registry);

        expect(mentionOf('ping')).toBe('/ping');
        expect(commands.ping?.id).toBeUndefined();
    });

    it('spaces a nested route when it falls back to plain text', () => {
        const buckets = guildBucket('g1', [['1', 'mod']]);
        buckets.set('g2', deployed([['2', 'mod']]));

        new CommandInjector().inject(buckets, [grouped()]);

        expect(mentionOf('mod/case/close')).toBe('/mod case close');
    });

    it('prefers the global id when a name exists both globally and in a guild', () => {
        const registry = [ping(), ping()];

        new CommandInjector().inject(
            deploy(deployed([['100', 'ping']]), guildBucket('g1', [['200', 'ping']])),
            registry
        );

        expect(mentionOf('ping')).toBe('</ping:100>');
    });

    it('ignores a context menu deployed under the same name as a slash command', () => {
        const slash = new SlashCommandBuilder().setName('report').setDescription('file a report');

        new CommandInjector().inject(
            deploy(
                deployed([
                    ['1', 'report'],
                    ['2', 'report', ApplicationCommandType.Message]
                ])
            ),
            [slash]
        );

        expect(mentionOf('report')).toBe('</report:1>');
    });

    it('ignores a same-named guild context menu when resolving a guild slash command', () => {
        const slash = new SlashCommandBuilder().setName('report').setDescription('file a report');
        const registry = [slash];

        new CommandInjector().inject(
            guildBucket('g1', [
                ['1', 'report'],
                ['2', 'report', ApplicationCommandType.User]
            ]),
            registry
        );

        expect(mentionOf('report')).toBe('</report:1>');
    });

    it('drops stale keys when re-injected after a rename', () => {
        const builders = [ping()];
        const injector = new CommandInjector();
        injector.inject(deploy(deployed([['1', 'ping']])), builders);
        expect(mentionOf('ping')).toBe('</ping:1>');

        builders.length = 0;
        builders.push(new SlashCommandBuilder().setName('pong').setDescription('Replies with Ping!'));
        injector.inject(deploy(deployed([['2', 'pong']])), builders);

        expect(mentionOf('pong')).toBe('</pong:2>');
        expect(() => mentionOf('ping')).toThrow();
    });

    it('throws on a route that has not resolved', () => {
        let caught: unknown;
        try {
            mentionOf('never-deployed');
        } catch (error) {
            caught = error;
        }

        expect(isSeedcordError(caught, 'SeedcordError', SeedcordErrorCode.CoreAccessorUnresolved)).toBe(true);
    });

    it('keeps a route named __proto__ as an ordinary entry', () => {
        const odd = new SlashCommandBuilder().setName('__proto__').setDescription('edge');

        new CommandInjector().inject(deploy(deployed([['7', '__proto__']])), [odd]);

        expect(mentionOf('__proto__')).toBe('</__proto__:7>');
        expect(Object.keys(Commands)).toContain('__proto__');
    });

    it('throws for a route name inherited from Object.prototype', () => {
        new CommandInjector().inject(deploy(deployed([['1', 'ping']])), [ping()]);

        let caught: unknown;
        try {
            mentionOf('constructor');
        } catch (error) {
            caught = error;
        }

        expect(isSeedcordError(caught, 'SeedcordError', SeedcordErrorCode.CoreAccessorUnresolved)).toBe(true);
    });

    it('enumerates through the guard, so a help listing reads every resolved route', () => {
        new CommandInjector().inject(
            deploy(
                deployed([
                    ['1', 'ping'],
                    ['2', 'ban']
                ])
            ),
            [ping(), withSubcommand()]
        );

        expect(Object.keys(Commands).sort()).toEqual(['ban/list', 'ping']);
    });

    it('records the id, route, and description of a top-level command', () => {
        new CommandInjector().inject(deploy(deployed([['123', 'ping']])), [ping()]);

        expect(commands.ping).toEqual({
            mention: '</ping:123>',
            id: '123',
            route: 'ping',
            description: 'Replies with Pong!'
        });
    });

    describe('context menus', () => {
        it('records a global user menu under its name', () => {
            new CommandInjector().inject(deploy(deployed([['9', 'View Profile', ApplicationCommandType.User]])), [
                userMenu()
            ]);

            expect(userMenus['View Profile']).toEqual({
                id: '9',
                name: 'View Profile',
                kind: ApplicationCommandType.User
            });
        });

        it('records a message menu in the message bucket', () => {
            new CommandInjector().inject(deploy(deployed([['8', 'Report Message', ApplicationCommandType.Message]])), [
                messageMenu()
            ]);

            expect(messageMenus['Report Message']?.kind).toBe(ApplicationCommandType.Message);
            expect(Object.keys(ContextMenus.user)).toHaveLength(0);
        });

        it('keeps a user and a message menu of the same name apart', () => {
            new CommandInjector().inject(
                deploy(
                    deployed([
                        ['1', 'Inspect', ApplicationCommandType.User],
                        ['2', 'Inspect', ApplicationCommandType.Message]
                    ])
                ),
                [userMenu('Inspect'), messageMenu('Inspect')]
            );

            expect(userMenus.Inspect?.id).toBe('1');
            expect(messageMenus.Inspect?.id).toBe('2');
        });

        it('resolves a single-guild menu against that guild id', () => {
            const registry = [userMenu()];

            new CommandInjector().inject(
                guildBucket('g1', [['77', 'View Profile', ApplicationCommandType.User]]),
                registry
            );

            expect(userMenus['View Profile']?.id).toBe('77');
        });

        it('records a menu deployed to two or more guilds with no id', () => {
            const registry = [userMenu()];
            const buckets = guildBucket('g1', [['1', 'View Profile', ApplicationCommandType.User]]);
            buckets.set('g2', deployed([['2', 'View Profile', ApplicationCommandType.User]]));

            new CommandInjector().inject(buckets, registry);

            expect(userMenus['View Profile']).toEqual({ name: 'View Profile', kind: ApplicationCommandType.User });
        });

        it('throws on a menu name that has not resolved', () => {
            let caught: unknown;
            try {
                // eslint-disable-next-line @typescript-eslint/no-unused-expressions -- the read is the assertion
                userMenus['Never Deployed'];
            } catch (error) {
                caught = error;
            }

            expect(isSeedcordError(caught, 'SeedcordError', SeedcordErrorCode.CoreAccessorUnresolved)).toBe(true);
        });

        it('drops stale menu names when re-injected after a rename', () => {
            const injector = new CommandInjector();
            injector.inject(deploy(deployed([['1', 'View Profile', ApplicationCommandType.User]])), [userMenu()]);

            injector.inject(deploy(deployed([['2', 'Inspect User', ApplicationCommandType.User]])), [
                userMenu('Inspect User')
            ]);

            expect(userMenus['Inspect User']?.id).toBe('2');
            expect(() => userMenus['View Profile']).toThrow();
        });
    });

    it('warns "user menu" for a deployed user menu that has no command in code', () => {
        const warn = vi.fn();
        // justified: warnLinks only calls warn
        const logger = { warn } as unknown as ILogger;

        warnLinks(logger, {
            multiGuild: [],
            notInCode: [{ name: 'probe', type: ApplicationCommandType.User }]
        });

        expect(warn).toHaveBeenCalledWith(expect.stringContaining('user menu'));
    });

    it('takes each nested route description from its own subcommand', () => {
        new CommandInjector().inject(
            deploy(
                deployed([
                    ['999', 'mod'],
                    ['42', 'ban']
                ])
            ),
            [grouped(), withSubcommand()]
        );

        expect(commands['mod/case/close']?.description).toBe('close a case');
        expect(commands['ban/list']?.description).toBe('list bans');
    });
});
