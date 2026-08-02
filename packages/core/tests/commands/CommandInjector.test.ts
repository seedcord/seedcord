import { ContextMenuCommandBuilder, SlashCommandBuilder } from '@discordjs/builders';
import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { ApplicationCommandType } from 'discord-api-types/v10';
import { describe, it, expect } from 'vitest';

import { CommandInjector, Commands, ContextMenus } from '@src/commands/CommandInjector';

import type { CommandInfo, ContextMenuInfo } from '@src/commands/CommandInjector';
import type { APIApplicationCommand } from 'discord-api-types/v10';

// justified: SlashOptionRegistry is empty in tests, so runtime values read through a plain record
const commands = Commands as Record<string, CommandInfo>;
const mentionOf = (route: string): string => commands[route]!.mention;

// justified: both context-menu registries are empty in tests, same as above
const userMenus = ContextMenus.user as Record<string, ContextMenuInfo>;
const messageMenus = ContextMenus.message as Record<string, ContextMenuInfo>;

type DeployedEntry = [id: string, name: string, type?: ApplicationCommandType];

function deployed(entries: DeployedEntry[]): Map<string, APIApplicationCommand> {
    const built = new Map<string, APIApplicationCommand>();
    // fixture: only the id, name, and type are read downstream
    for (const [id, name, type = ApplicationCommandType.ChatInput] of entries)
        built.set(id, { id, name, type } as unknown as APIApplicationCommand);
    return built;
}

function guildBucket(guildId: string, entries: DeployedEntry[]): Map<string, Map<string, APIApplicationCommand>> {
    const guilds = new Map<string, Map<string, APIApplicationCommand>>();
    guilds.set(guildId, deployed(entries));
    return guilds;
}

function ping(): SlashCommandBuilder {
    return new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!');
}

function grouped(): SlashCommandBuilder {
    const builder = new SlashCommandBuilder().setName('mod').setDescription('moderation');
    builder.addSubcommandGroup((group) =>
        group
            .setName('case')
            .setDescription('cases')
            .addSubcommand((sub) => sub.setName('close').setDescription('close a case'))
    );
    return builder;
}

function userMenu(name = 'View Profile'): ContextMenuCommandBuilder {
    return new ContextMenuCommandBuilder().setName(name).setType(ApplicationCommandType.User);
}

function messageMenu(name = 'Report Message'): ContextMenuCommandBuilder {
    return new ContextMenuCommandBuilder().setName(name).setType(ApplicationCommandType.Message);
}

function withSubcommand(): SlashCommandBuilder {
    const builder = new SlashCommandBuilder().setName('ban').setDescription('ban');
    builder.addSubcommand((sub) => sub.setName('list').setDescription('list bans'));
    return builder;
}

describe('CommandInjector', () => {
    it('links a global command to a clickable mention', () => {
        new CommandInjector().inject({ global: deployed([['123', 'ping']]), guilds: new Map() }, [ping()]);

        expect(mentionOf('ping')).toBe('</ping:123>');
    });

    it('links a grouped leaf with the group in the middle slot', () => {
        new CommandInjector().inject({ global: deployed([['999', 'mod']]), guilds: new Map() }, [grouped()]);

        expect(mentionOf('mod/case/close')).toBe('</mod case close:999>');
    });

    it('links a subcommand leaf to its parent id', () => {
        new CommandInjector().inject({ global: deployed([['42', 'ban']]), guilds: new Map() }, [withSubcommand()]);

        expect(mentionOf('ban/list')).toBe('</ban list:42>');
    });

    it('resolves a single-guild command against that guild id', () => {
        const registry = [ping()];

        new CommandInjector().inject({ global: new Map(), guilds: guildBucket('g1', [['555', 'ping']]) }, registry);

        expect(mentionOf('ping')).toBe('</ping:555>');
    });

    it('falls back to plain text for a command deployed to two or more guilds', () => {
        const registry = [ping()];
        const buckets = guildBucket('g1', [['1', 'ping']]);
        buckets.set('g2', deployed([['2', 'ping']]));

        new CommandInjector().inject({ global: new Map(), guilds: buckets }, registry);

        expect(mentionOf('ping')).toBe('/ping');
        expect(commands.ping?.id).toBeUndefined();
    });

    it('spaces a nested route when it falls back to plain text', () => {
        const buckets = guildBucket('g1', [['1', 'mod']]);
        buckets.set('g2', deployed([['2', 'mod']]));

        new CommandInjector().inject({ global: new Map(), guilds: buckets }, [grouped()]);

        expect(mentionOf('mod/case/close')).toBe('/mod case close');
    });

    it('prefers the global id when a name exists both globally and in a guild', () => {
        const registry = [ping(), ping()];

        new CommandInjector().inject(
            { global: deployed([['100', 'ping']]), guilds: guildBucket('g1', [['200', 'ping']]) },
            registry
        );

        expect(mentionOf('ping')).toBe('</ping:100>');
    });

    // Discord scopes name uniqueness per command type, and a context-menu name may be all lowercase
    it('ignores a context menu deployed under the same name as a slash command', () => {
        const slash = new SlashCommandBuilder().setName('report').setDescription('file a report');

        new CommandInjector().inject(
            {
                global: deployed([
                    ['1', 'report'],
                    ['2', 'report', ApplicationCommandType.Message]
                ]),
                guilds: new Map()
            },
            [slash]
        );

        expect(mentionOf('report')).toBe('</report:1>');
    });

    it('ignores a same-named guild context menu when resolving a guild slash command', () => {
        const slash = new SlashCommandBuilder().setName('report').setDescription('file a report');
        const registry = [slash];

        new CommandInjector().inject(
            {
                global: new Map(),
                guilds: guildBucket('g1', [
                    ['1', 'report'],
                    ['2', 'report', ApplicationCommandType.User]
                ])
            },
            registry
        );

        expect(mentionOf('report')).toBe('</report:1>');
    });

    it('drops stale keys when re-injected after a rename', () => {
        const builders = [ping()];
        const injector = new CommandInjector();
        injector.inject({ global: deployed([['1', 'ping']]), guilds: new Map() }, builders);
        expect(mentionOf('ping')).toBe('</ping:1>');

        builders.length = 0;
        builders.push(new SlashCommandBuilder().setName('pong').setDescription('Replies with Ping!'));
        injector.inject({ global: deployed([['2', 'pong']]), guilds: new Map() }, builders);

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

        new CommandInjector().inject({ global: deployed([['7', '__proto__']]), guilds: new Map() }, [odd]);

        expect(mentionOf('__proto__')).toBe('</__proto__:7>');
        expect(Object.keys(Commands)).toContain('__proto__');
    });

    it('throws for a route name inherited from Object.prototype', () => {
        new CommandInjector().inject({ global: deployed([['1', 'ping']]), guilds: new Map() }, [ping()]);

        expect(() => mentionOf('constructor')).toThrow();
    });

    it('enumerates through the guard, so a help listing reads every resolved route', () => {
        new CommandInjector().inject(
            {
                global: deployed([
                    ['1', 'ping'],
                    ['2', 'ban']
                ]),
                guilds: new Map()
            },
            [ping(), withSubcommand()]
        );

        expect(Object.keys(Commands).sort()).toEqual(['ban/list', 'ping']);
    });

    it('records the id, route, and description of a top-level command', () => {
        new CommandInjector().inject({ global: deployed([['123', 'ping']]), guilds: new Map() }, [ping()]);

        expect(commands.ping).toEqual({
            mention: '</ping:123>',
            id: '123',
            route: 'ping',
            description: 'Replies with Pong!'
        });
    });

    describe('context menus', () => {
        it('records a global user menu under its name', () => {
            new CommandInjector().inject(
                { global: deployed([['9', 'View Profile', ApplicationCommandType.User]]), guilds: new Map() },
                [userMenu()]
            );

            expect(userMenus['View Profile']).toEqual({
                id: '9',
                name: 'View Profile',
                kind: ApplicationCommandType.User
            });
        });

        it('records a message menu in the message bucket', () => {
            new CommandInjector().inject(
                { global: deployed([['8', 'Report Message', ApplicationCommandType.Message]]), guilds: new Map() },
                [messageMenu()]
            );

            expect(messageMenus['Report Message']?.kind).toBe(ApplicationCommandType.Message);
            expect(Object.keys(ContextMenus.user)).toHaveLength(0);
        });

        // Discord allows a user and a message command to share a name, which is why the buckets are split
        it('keeps a user and a message menu of the same name apart', () => {
            new CommandInjector().inject(
                {
                    global: deployed([
                        ['1', 'Inspect', ApplicationCommandType.User],
                        ['2', 'Inspect', ApplicationCommandType.Message]
                    ]),
                    guilds: new Map()
                },
                [userMenu('Inspect'), messageMenu('Inspect')]
            );

            expect(userMenus.Inspect?.id).toBe('1');
            expect(messageMenus.Inspect?.id).toBe('2');
        });

        it('resolves a single-guild menu against that guild id', () => {
            const registry = [userMenu()];

            new CommandInjector().inject(
                {
                    global: new Map(),
                    guilds: guildBucket('g1', [['77', 'View Profile', ApplicationCommandType.User]])
                },
                registry
            );

            expect(userMenus['View Profile']?.id).toBe('77');
        });

        it('records a menu deployed to two or more guilds with no id', () => {
            const registry = [userMenu()];
            const buckets = guildBucket('g1', [['1', 'View Profile', ApplicationCommandType.User]]);
            buckets.set('g2', deployed([['2', 'View Profile', ApplicationCommandType.User]]));

            new CommandInjector().inject({ global: new Map(), guilds: buckets }, registry);

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
            injector.inject(
                { global: deployed([['1', 'View Profile', ApplicationCommandType.User]]), guilds: new Map() },
                [userMenu()]
            );

            injector.inject(
                { global: deployed([['2', 'Inspect User', ApplicationCommandType.User]]), guilds: new Map() },
                [userMenu('Inspect User')]
            );

            expect(userMenus['Inspect User']?.id).toBe('2');
            expect(() => userMenus['View Profile']).toThrow();
        });
    });

    it('takes each nested route description from its own subcommand', () => {
        new CommandInjector().inject(
            {
                global: deployed([
                    ['999', 'mod'],
                    ['42', 'ban']
                ]),
                guilds: new Map()
            },
            [grouped(), withSubcommand()]
        );

        expect(commands['mod/case/close']?.description).toBe('close a case');
        expect(commands['ban/list']?.description).toBe('list bans');
    });
});
