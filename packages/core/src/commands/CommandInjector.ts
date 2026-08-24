import { SlashCommandBuilder } from '@discordjs/builders';
import { paint } from '@seedcord/errors';
import { Logger } from '@seedcord/logger';
import { routeLeavesOf } from '@seedcord/utils/internal';
import { ApplicationCommandType } from 'discord-api-types/v10';

import { contextMenuLeaves } from '#src/commands/contextMenuLeaves';
import { accessorStore, clearStore, guardedAccessor } from '#src/miscellaneous/guarded';

import type {
    ContextMenuKind,
    MessageContextMenuRegistry,
    UserContextMenuRegistry
} from '#registries/ContextMenuRegistry';
import type { SlashRegistry } from '#registries/SlashRegistry';
import type { CommandBuilder, DeployResult } from '#src/commands/types';
import type { APIApplicationCommand, Snowflake } from 'discord-api-types/v10';

const commandStorage = accessorStore<CommandInfo>();
const userMenuStorage = accessorStore<ContextMenuInfo>();
const messageMenuStorage = accessorStore<ContextMenuInfo>();

/** What {@link Commands} resolves to for one slash route. */
export interface CommandInfo {
    /** The clickable `</config set:id>` mention. A route whose id did not resolve falls back to `/config set`. */
    readonly mention: string;
    /** The deployed command id. Absent when the command deployed to two or more guilds. */
    readonly id?: string;
    /** The full route, e.g. `config/set`. */
    readonly route: string;
    /** The route's own description, taken from the subcommand for a nested route. */
    readonly description: string;
}

/** Each registered slash route mapped to its deployed command. */
export type InjectedCommandMap = {
    [K in keyof SlashRegistry]: CommandInfo;
};

/**
 * The bot's deployed slash commands, keyed by {@link SlashRegistry}. Filled by
 * {@link CommandInjector} after each deploy, and a read before that throws.
 *
 * @example
 * ```ts
 * import { Commands } from '@seedcord/gateway';
 *
 * await this.reply(`Try ${Commands['config/set'].mention}`);
 *
 * // a help listing
 * const lines = Object.values(Commands).map((c) => `${c.mention} ${c.description}`);
 * ```
 */
export const Commands = guardedAccessor('Commands', commandStorage) as InjectedCommandMap;

/** What {@link ContextMenus} resolves to for one context-menu command. */
export interface ContextMenuInfo {
    /** The deployed command id. Absent when the command deployed to two or more guilds. */
    readonly id?: string;
    /** The name shown in Discord's right-click menu. */
    readonly name: string;
    readonly kind: ContextMenuKind;
}

/** Deployed context-menu commands, split by kind because Discord scopes name uniqueness per command type. */
export interface InjectedContextMenuMap {
    readonly user: { [K in keyof UserContextMenuRegistry]: ContextMenuInfo };
    readonly message: { [K in keyof MessageContextMenuRegistry]: ContextMenuInfo };
}

/**
 * The bot's deployed context-menu commands. Filled by {@link CommandInjector} after each deploy, and a read
 * before that throws.
 *
 * @example
 * ```ts
 * import { ContextMenus } from '@seedcord/gateway';
 *
 * const id = ContextMenus.user['View Profile'].id;
 * ```
 */
export const ContextMenus = {
    user: guardedAccessor('ContextMenus.user', userMenuStorage),
    message: guardedAccessor('ContextMenus.message', messageMenuStorage)
} as InjectedContextMenuMap;

const MULTI_GUILD = Symbol('seedcord:commands:multi-guild');

// Discord scopes name uniqueness per type, and a context-menu name may be all lowercase like a slash name
function commandKey(type: ApplicationCommandType, name: string): string {
    return `${type}:${name}`;
}

function slashBuildersOf(all: readonly CommandBuilder[]): SlashCommandBuilder[] {
    const slash = all.filter((command): command is SlashCommandBuilder => command instanceof SlashCommandBuilder);
    // a guild command in N guilds is the same builder pushed once per guild
    return [...new Set(slash)];
}

interface DeployedIds {
    readonly global: Map<string, Snowflake>;
    readonly guild: Map<string, Snowflake | typeof MULTI_GUILD>;
    readonly warned: Set<string>;
}

/** @internal */
export class CommandInjector {
    private readonly logger = new Logger('Commands', { channel: 'bot' });

    public inject(deploy: DeployResult, all: readonly CommandBuilder[]): void {
        this.clear();

        const ids: DeployedIds = {
            global: this.indexByKey(deploy.global),
            guild: this.indexGuilds(deploy.guilds),
            warned: new Set<string>()
        };
        let clickable = 0;

        for (const command of slashBuildersOf(all)) {
            const id = this.resolveId(
                ApplicationCommandType.ChatInput,
                command.name,
                ids,
                'falling back to plain text (not clickable)'
            );
            for (const leaf of routeLeavesOf(command.toJSON())) {
                commandStorage[leaf.route] = {
                    mention: id ? this.toMention(leaf.route, id) : this.toPlain(leaf.route),
                    ...(id && { id }),
                    route: leaf.route,
                    description: leaf.description
                };
                if (id) clickable++;
            }
        }

        const menus = contextMenuLeaves(all);
        this.injectMenus(menus.user, ApplicationCommandType.User, userMenuStorage, ids);
        this.injectMenus(menus.message, ApplicationCommandType.Message, messageMenuStorage, ids);

        this.logger.utils.summary('Linked commands', {
            clickable,
            plain: Object.keys(commandStorage).length - clickable,
            'context menus': menus.user.size + menus.message.size
        });
    }

    private injectMenus(
        names: ReadonlySet<string>,
        kind: ContextMenuKind,
        storage: Record<string, ContextMenuInfo>,
        ids: DeployedIds
    ): void {
        for (const name of names) {
            const id = this.resolveId(kind, name, ids, 'leaving its id unset');
            storage[name] = { ...(id && { id }), name, kind };
        }
    }

    private indexByKey(collection: Map<Snowflake, APIApplicationCommand>): Map<string, Snowflake> {
        const map = new Map<string, Snowflake>();
        for (const command of collection.values()) map.set(commandKey(command.type, command.name), command.id);
        return map;
    }

    private indexGuilds(
        guilds: Map<Snowflake, Map<Snowflake, APIApplicationCommand>>
    ): Map<string, Snowflake | typeof MULTI_GUILD> {
        const map = new Map<string, Snowflake | typeof MULTI_GUILD>();
        for (const collection of guilds.values()) {
            for (const command of collection.values()) {
                const key = commandKey(command.type, command.name);
                const existing = map.get(key);
                // Discord assigns a separate id per guild, so two ids for one name means no single mention
                if (existing === undefined) map.set(key, command.id);
                else if (existing !== command.id) map.set(key, MULTI_GUILD);
            }
        }
        return map;
    }

    private resolveId(
        type: ApplicationCommandType,
        name: string,
        ids: DeployedIds,
        consequence: string
    ): Snowflake | undefined {
        const key = commandKey(type, name);
        const global = ids.global.get(key);
        if (global) return global;

        const guild = ids.guild.get(key);
        if (guild === undefined) return undefined;
        if (guild === MULTI_GUILD) {
            if (!ids.warned.has(key)) {
                this.logger.warn(`${paint.sky.bold(name)} is deployed to multiple guilds, ${consequence}.`);
                ids.warned.add(key);
            }
            return undefined;
        }
        return guild;
    }

    private toMention(route: string, id: Snowflake): string {
        return `</${route.replaceAll('/', ' ')}:${id}>`;
    }

    private toPlain(route: string): string {
        return `/${route.replaceAll('/', ' ')}`;
    }

    private clear(): void {
        for (const store of [commandStorage, userMenuStorage, messageMenuStorage]) clearStore(store);
    }
}
