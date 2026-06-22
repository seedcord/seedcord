import { Collection, SlashCommandBuilder } from 'discord.js';
import { describe, it, expect } from 'vitest';

import { CommandMentionInjector, CommandMentions } from '@bot/injectors/CommandMentionInjector';

import type { Core } from '@interfaces/Core';
import type { ApplicationCommand } from 'discord.js';

// the accessor is typed by the (empty in tests) SlashOptionRegistry, so read runtime values through a plain record
const mentions = CommandMentions as Record<string, string>;

function stubCore(global: SlashCommandBuilder[], guilds = new Collection<string, SlashCommandBuilder[]>()): Core {
    // fixture: the injector reads only bot.commands.globalCommands and guildCommands
    return { bot: { commands: { globalCommands: global, guildCommands: guilds } } } as unknown as Core;
}

function commandCollection(entries: [id: string, name: string][]): Collection<string, ApplicationCommand> {
    const collection = new Collection<string, ApplicationCommand>();
    // fixture: only id (key) and name are read
    for (const [id, name] of entries) collection.set(id, { id, name } as unknown as ApplicationCommand);
    return collection;
}

function guildBucket(
    guildId: string,
    entries: [id: string, name: string][]
): Collection<string, Collection<string, ApplicationCommand>> {
    const guilds = new Collection<string, Collection<string, ApplicationCommand>>();
    guilds.set(guildId, commandCollection(entries));
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

function withSubcommand(): SlashCommandBuilder {
    const builder = new SlashCommandBuilder().setName('ban').setDescription('ban');
    builder.addSubcommand((sub) => sub.setName('list').setDescription('list bans'));
    return builder;
}

describe('CommandMentionInjector', () => {
    it('links a global command to a clickable mention', () => {
        const injector = new CommandMentionInjector(stubCore([ping()]));

        injector.inject({ global: commandCollection([['123', 'ping']]), guilds: new Collection() });

        expect(mentions.ping).toBe('</ping:123>');
    });

    it('links a grouped leaf with the group in the middle slot', () => {
        const injector = new CommandMentionInjector(stubCore([grouped()]));

        injector.inject({ global: commandCollection([['999', 'mod']]), guilds: new Collection() });

        expect(mentions['mod/case/close']).toBe('</mod case close:999>');
    });

    it('links a subcommand leaf to its parent id', () => {
        const injector = new CommandMentionInjector(stubCore([withSubcommand()]));

        injector.inject({ global: commandCollection([['42', 'ban']]), guilds: new Collection() });

        expect(mentions['ban/list']).toBe('</ban list:42>');
    });

    it('resolves a single-guild command against that guild id', () => {
        const guilds = new Collection<string, SlashCommandBuilder[]>([['g1', [ping()]]]);
        const injector = new CommandMentionInjector(stubCore([], guilds));

        injector.inject({ global: new Collection(), guilds: guildBucket('g1', [['555', 'ping']]) });

        expect(mentions.ping).toBe('</ping:555>');
    });

    it('falls back to plain text for a command deployed to two or more guilds', () => {
        const guilds = new Collection<string, SlashCommandBuilder[]>([['g1', [ping()]]]);
        const injector = new CommandMentionInjector(stubCore([], guilds));

        const buckets = guildBucket('g1', [['1', 'ping']]);
        buckets.set('g2', commandCollection([['2', 'ping']]));

        injector.inject({ global: new Collection(), guilds: buckets });

        expect(mentions.ping).toBe('/ping');
    });

    it('prefers the global id when a name exists both globally and in a guild', () => {
        const guilds = new Collection<string, SlashCommandBuilder[]>([['g1', [ping()]]]);
        const injector = new CommandMentionInjector(stubCore([ping()], guilds));

        injector.inject({ global: commandCollection([['100', 'ping']]), guilds: guildBucket('g1', [['200', 'ping']]) });

        expect(mentions.ping).toBe('</ping:100>');
    });

    it('drops stale keys when re-injected after a rename', () => {
        const builders = [ping()];
        const injector = new CommandMentionInjector(stubCore(builders));
        injector.inject({ global: commandCollection([['1', 'ping']]), guilds: new Collection() });
        expect(mentions.ping).toBe('</ping:1>');

        builders.length = 0;
        builders.push(new SlashCommandBuilder().setName('pong').setDescription('Replies with Ping!'));
        injector.inject({ global: commandCollection([['2', 'pong']]), guilds: new Collection() });

        expect(mentions.pong).toBe('</pong:2>');
        expect(mentions.ping).toBeUndefined();
    });
});
