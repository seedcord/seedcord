import { paint } from '@seedcord/errors';
import { Logger } from '@seedcord/logger';
import { ApplicationCommandType } from 'discord-api-types/v10';

import { linkCommands } from '#src/commands/linkCommands';
import { accessorStore, clearStore, guardedAccessor } from '#src/miscellaneous/guarded';

import type {
    ContextMenuKind,
    MessageContextMenuRegistry,
    UserContextMenuRegistry
} from '#registries/ContextMenuRegistry';
import type { SlashRegistry } from '#registries/SlashRegistry';
import type { CommandRef, LinkedCommands } from '#src/commands/linkCommands';
import type { CommandBuilder, DeployResult } from '#src/commands/types';

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

function installLinks({ commands, contextMenus }: Pick<LinkedCommands, 'commands' | 'contextMenus'>): void {
    const pairs = [
        [commandStorage, commands],
        [userMenuStorage, contextMenus.user],
        [messageMenuStorage, contextMenus.message]
    ] as const;
    for (const [store, values] of pairs) {
        clearStore(store);
        Object.assign(store, values);
    }
}

function multiGuildConsequence({ type }: CommandRef): string {
    return type === ApplicationCommandType.ChatInput
        ? 'falling back to plain text (not clickable)'
        : 'leaving its id unset';
}

/** @internal */
export class CommandInjector {
    private readonly logger = new Logger('Commands', { channel: 'bot' });

    public inject(deploy: DeployResult, all: readonly CommandBuilder[]): void {
        const linked = linkCommands(deploy, all);
        installLinks(linked);

        for (const ref of linked.multiGuild) {
            this.logger.warn(
                `${paint.sky.bold(ref.name)} is deployed to multiple guilds, ${multiGuildConsequence(ref)}.`
            );
        }

        const routes = Object.values(linked.commands);
        const clickable = routes.filter((command) => command.id !== undefined).length;
        this.logger.utils.summary('Linked commands', {
            clickable,
            plain: routes.length - clickable,
            'context menus':
                Object.keys(linked.contextMenus.user).length + Object.keys(linked.contextMenus.message).length
        });
    }
}
