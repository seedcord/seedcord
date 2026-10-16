import { routeLeavesOf } from '@seedcord/utils/internal';
import { ApplicationCommandType } from 'discord-api-types/v10';

import { contextMenuLeaves } from '#src/commands/contextMenuLeaves';
import { GLOBAL_ID } from '#src/commands/scopes';
import { accessorStore } from '#src/miscellaneous/guarded';

import type { ContextMenuKind } from '#registries/ContextMenuRegistry';
import type { CommandInfo, ContextMenuInfo } from '#src/commands/CommandInjector';
import type { DeployResult } from '#src/commands/types';
import type {
    APIApplicationCommand,
    RESTPostAPIApplicationCommandsJSONBody as CommandJson,
    RESTPostAPIChatInputApplicationCommandsJSONBody,
    Snowflake
} from 'discord-api-types/v10';

export interface CommandRef {
    readonly name: string;
    readonly type: ApplicationCommandType;
}

interface LinkedContextMenus {
    readonly user: Record<string, ContextMenuInfo>;
    readonly message: Record<string, ContextMenuInfo>;
}

export interface LinkedCommands {
    readonly commands: Record<string, CommandInfo>;
    readonly contextMenus: LinkedContextMenus;
    readonly multiGuild: CommandRef[];
    readonly notInCode: CommandRef[];
}

const MULTI_GUILD = Symbol('seedcord:commands:multi-guild');
type DeployedId = Snowflake | typeof MULTI_GUILD;

interface CommandLike {
    name: string;
    type?: ApplicationCommandType | undefined;
}

export function commandRefOf({ name, type }: CommandLike): CommandRef {
    // discord reads a missing type as a slash command
    return { name, type: type ?? ApplicationCommandType.ChatInput };
}

// Discord keeps command names unique per type
export function commandKey(command: CommandLike): string {
    const { type, name } = commandRefOf(command);
    return `${type}:${name}`;
}

export function indexById(commands: readonly APIApplicationCommand[]): Map<string, APIApplicationCommand> {
    return new Map(commands.map((command) => [command.id, command]));
}

function isSlash(json: CommandJson): json is RESTPostAPIChatInputApplicationCommandsJSONBody {
    return commandRefOf(json).type === ApplicationCommandType.ChatInput;
}

// a guild command in N guilds appears once per guild
function uniqueRefs(refs: readonly CommandRef[]): CommandRef[] {
    return [...new Map(refs.map((ref) => [commandKey(ref), ref])).values()];
}

function deployedIds(deploy: DeployResult): Map<string, DeployedId> {
    const ids = new Map<string, DeployedId>();
    for (const [scope, collection] of deploy) {
        if (scope === GLOBAL_ID) continue;
        for (const command of collection.values()) {
            const key = commandKey(command);
            const existing = ids.get(key);
            // Discord gives a guild command its own id in each guild
            if (existing === undefined) ids.set(key, command.id);
            else if (existing !== command.id) ids.set(key, MULTI_GUILD);
        }
    }
    // a global command's one id wins over any guild copy
    for (const command of deploy.get(GLOBAL_ID)?.values() ?? []) ids.set(commandKey(command), command.id);
    return ids;
}

function allDeployed(deploy: DeployResult): APIApplicationCommand[] {
    return [...deploy.values()].flatMap((collection) => [...collection.values()]);
}

function mentionOf(route: string, id: Snowflake | undefined): string {
    const spaced = route.replaceAll('/', ' ');
    return id ? `</${spaced}:${id}>` : `/${spaced}`;
}

class CommandLinker {
    private readonly ids: Map<string, DeployedId>;

    constructor(private readonly deploy: DeployResult) {
        this.ids = deployedIds(deploy);
    }

    public link(all: readonly CommandJson[]): LinkedCommands {
        const slash = all.filter(isSlash);
        const leaves = contextMenuLeaves(all);
        const inCode = uniqueRefs([
            ...slash.map(commandRefOf),
            ...[...leaves.user].map((name) => ({ name, type: ApplicationCommandType.User })),
            ...[...leaves.message].map((name) => ({ name, type: ApplicationCommandType.Message }))
        ]);

        return {
            commands: this.slashRoutes(slash),
            contextMenus: {
                user: this.menus(leaves.user, ApplicationCommandType.User),
                message: this.menus(leaves.message, ApplicationCommandType.Message)
            },
            multiGuild: inCode.filter((ref) => this.ids.get(commandKey(ref)) === MULTI_GUILD),
            notInCode: this.notInCode(inCode)
        };
    }

    private slashRoutes(
        slash: readonly RESTPostAPIChatInputApplicationCommandsJSONBody[]
    ): Record<string, CommandInfo> {
        const commands = accessorStore<CommandInfo>();
        for (const command of slash) {
            const id = this.idOf(commandRefOf(command));
            for (const { route, description } of routeLeavesOf(command)) {
                commands[route] = { mention: mentionOf(route, id), ...(id && { id }), route, description };
            }
        }
        return commands;
    }

    private menus(names: ReadonlySet<string>, kind: ContextMenuKind): Record<string, ContextMenuInfo> {
        const menus = accessorStore<ContextMenuInfo>();
        for (const name of names) {
            const id = this.idOf({ name, type: kind });
            menus[name] = { ...(id && { id }), name, kind };
        }
        return menus;
    }

    private idOf(ref: CommandRef): Snowflake | undefined {
        const id = this.ids.get(commandKey(ref));
        return id === MULTI_GUILD ? undefined : id;
    }

    private notInCode(inCode: readonly CommandRef[]): CommandRef[] {
        const inCodeKeys = new Set(inCode.map(commandKey));
        const extra = new Map<string, CommandRef>();
        for (const command of allDeployed(this.deploy)) {
            const key = commandKey(command);
            if (!inCodeKeys.has(key)) extra.set(key, commandRefOf(command));
        }
        return [...extra.values()];
    }
}

export function linkCommands(deploy: DeployResult, all: readonly CommandJson[]): LinkedCommands {
    return new CommandLinker(deploy).link(all);
}
