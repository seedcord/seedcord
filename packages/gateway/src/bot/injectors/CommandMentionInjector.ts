import { SlashCommandBuilder } from '@discordjs/builders';
import { Logger } from '@seedcord/logger';
import { routeLeavesOf } from '@seedcord/utils/internal';
import { chatInputApplicationCommandMention } from 'discord.js';

import type { DeployResult } from '@bControllers/CommandRegistry';
import type { Core } from '@interfaces/Core';
import type { SlashOptionRegistry } from '@seedcord/core';
import type { ApplicationCommand, Snowflake } from 'discord.js';

const mentionStorage: Record<string, string> = {};

/** Each registered slash route mapped to its mention string. */
export type InjectedMentionMap = {
    [K in keyof SlashOptionRegistry]: string;
};

/**
 * Ready-to-send command mention strings, keyed by {@link SlashOptionRegistry}.
 *
 * A value is a clickable `</name:id>` when the command's id resolved from the deploy, otherwise the plain
 * `/name` text. Populated by {@link CommandMentionInjector} after each deploy.
 */
export const CommandMentions = mentionStorage as InjectedMentionMap;

const MULTI_GUILD = Symbol('seedcord:commandmentions:multi-guild');

/**
 * Turns each deployed slash route into a clickable command mention exposed through {@link CommandMentions}.
 *
 * Consumes the ids {@link DeployResult} carries, so it runs after a deploy rather than resolving from a name
 * cache (discord.js offers none for command ids). A global command is clickable everywhere by its app-wide id.
 * A guild command deployed to one guild is clickable by that guild's id. A command deployed to two or more
 * guilds mints a different id per guild, so one accessor key cannot resolve it, and it falls back to plain
 * `/name` text with one warn. On a non-owning shard a guild command also falls back to plain text.
 *
 * @internal
 */
export class CommandMentionInjector {
    private readonly logger = new Logger('CommandMentions', { channel: 'bot' });

    constructor(private readonly core: Core) {}

    public inject(deploy: DeployResult): void {
        this.clear();

        const globalIds = this.indexByName(deploy.global);
        const guildIds = this.indexGuilds(deploy.guilds);
        const warned = new Set<string>();
        let clickable = 0;

        for (const command of this.allSlashBuilders()) {
            const id = this.resolveId(command.name, globalIds, guildIds, warned);
            for (const leaf of routeLeavesOf(command.toJSON())) {
                mentionStorage[leaf.route] = id ? this.toMention(leaf.route, id) : this.toPlain(leaf.route);
                if (id) clickable++;
            }
        }

        this.logger.utils.summary('Linked mentions', {
            clickable,
            plain: Object.keys(mentionStorage).length - clickable
        });
    }

    private allSlashBuilders(): SlashCommandBuilder[] {
        const registry = this.core.bot.commands;
        if (!registry) return [];
        // a guild command in N guilds is the same builder pushed once per guild, so dedupe by reference
        const all = [...registry.globalCommands, ...registry.guildCommands.values()].flat();
        const slash = all.filter((command): command is SlashCommandBuilder => command instanceof SlashCommandBuilder);
        return [...new Set(slash)];
    }

    private indexByName(collection: Map<Snowflake, ApplicationCommand>): Map<string, Snowflake> {
        const map = new Map<string, Snowflake>();
        for (const command of collection.values()) map.set(command.name, command.id);
        return map;
    }

    private indexGuilds(
        guilds: Map<Snowflake, Map<Snowflake, ApplicationCommand>>
    ): Map<string, Snowflake | typeof MULTI_GUILD> {
        const map = new Map<string, Snowflake | typeof MULTI_GUILD>();
        for (const collection of guilds.values()) {
            for (const command of collection.values()) {
                const existing = map.get(command.name);
                if (existing === undefined) map.set(command.name, command.id);
                else if (existing !== command.id) map.set(command.name, MULTI_GUILD);
            }
        }
        return map;
    }

    private resolveId(
        name: string,
        globalIds: Map<string, Snowflake>,
        guildIds: Map<string, Snowflake | typeof MULTI_GUILD>,
        warned: Set<string>
    ): Snowflake | undefined {
        const global = globalIds.get(name);
        if (global) return global;

        const guild = guildIds.get(name);
        if (guild === undefined) return undefined;
        if (guild === MULTI_GUILD) {
            if (!warned.has(name)) {
                this.logger.warn(`${name} is deployed to multiple guilds, falling back to plain text (not clickable).`);
                warned.add(name);
            }
            return undefined;
        }
        return guild;
    }

    // buildSlashRoute puts the GROUP in the middle slot, matching the 4-arg (name, group, sub, id) overload order
    private toMention(route: string, id: Snowflake): string {
        const [name, middle, sub] = route.split('/');
        if (name && middle && sub) return chatInputApplicationCommandMention(name, middle, sub, id);
        if (name && middle) return chatInputApplicationCommandMention(name, middle, id);
        return chatInputApplicationCommandMention(name ?? route, id);
    }

    private toPlain(route: string): string {
        return `/${route.replaceAll('/', ' ')}`;
    }

    private clear(): void {
        for (const key of Object.keys(mentionStorage)) Reflect.deleteProperty(mentionStorage, key);
    }
}
