import { routeLeavesOf } from '@seedcord/utils/internal';
import { ApplicationCommandType } from 'discord-api-types/v10';

import { contextMenuLeaves } from '#src/commands/contextMenuLeaves';
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

export interface LinkedContextMenus {
    readonly user: Record<string, ContextMenuInfo>;
    readonly message: Record<string, ContextMenuInfo>;
}

export interface LinkedCommands {
    readonly commands: Record<string, CommandInfo>;
    readonly contextMenus: LinkedContextMenus;
    readonly notDeployed: CommandRef[];
    readonly multiGuild: CommandRef[];
    readonly notInCode: CommandRef[];
}

const MULTI_GUILD = Symbol('seedcord:commands:multi-guild');
type DeployedId = Snowflake | typeof MULTI_GUILD;

// Discord keeps command names unique per type
function keyOf({ type, name }: CommandRef): string {
    return `${type}:${name}`;
}

function isSlash(json: CommandJson): json is RESTPostAPIChatInputApplicationCommandsJSONBody {
    // discord reads a missing type as a slash command
    return (json.type ?? ApplicationCommandType.ChatInput) === ApplicationCommandType.ChatInput;
}

// a guild command in N guilds appears once per guild
function slashCommandsOf(all: readonly CommandJson[]): RESTPostAPIChatInputApplicationCommandsJSONBody[] {
    const byName = new Map<string, RESTPostAPIChatInputApplicationCommandsJSONBody>();
    for (const json of all) if (isSlash(json)) byName.set(json.name, json);
    return [...byName.values()];
}

function deployedIds({ global, guilds }: DeployResult): Map<string, DeployedId> {
    const ids = new Map<string, DeployedId>();
    for (const collection of guilds.values()) {
        for (const command of collection.values()) {
            const key = keyOf(command);
            const existing = ids.get(key);
            // Discord gives a guild command its own id in each guild
            if (existing === undefined) ids.set(key, command.id);
            else if (existing !== command.id) ids.set(key, MULTI_GUILD);
        }
    }
    for (const command of global.values()) ids.set(keyOf(command), command.id);
    return ids;
}

function allDeployed({ global, guilds }: DeployResult): APIApplicationCommand[] {
    return [...global.values(), ...[...guilds.values()].flatMap((collection) => [...collection.values()])];
}

function mentionOf(route: string, id: Snowflake | undefined): string {
    const spaced = route.replaceAll('/', ' ');
    return id ? `</${spaced}:${id}>` : `/${spaced}`;
}

class CommandLinker {
    private readonly ids: Map<string, DeployedId>;
    private readonly inCode = new Set<string>();
    private readonly notDeployed = new Map<string, CommandRef>();
    private readonly multiGuild = new Map<string, CommandRef>();

    constructor(private readonly deploy: DeployResult) {
        this.ids = deployedIds(deploy);
    }

    public link(all: readonly CommandJson[]): LinkedCommands {
        const leaves = contextMenuLeaves(all);
        const commands = this.slashRoutes(all);
        const contextMenus = {
            user: this.menus(leaves.user, ApplicationCommandType.User),
            message: this.menus(leaves.message, ApplicationCommandType.Message)
        };

        return {
            commands,
            contextMenus,
            notDeployed: [...this.notDeployed.values()],
            multiGuild: [...this.multiGuild.values()],
            notInCode: this.notInCode()
        };
    }

    private slashRoutes(all: readonly CommandJson[]): Record<string, CommandInfo> {
        const commands = accessorStore<CommandInfo>();
        for (const command of slashCommandsOf(all)) {
            const id = this.idOf({ name: command.name, type: ApplicationCommandType.ChatInput });
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
        const key = keyOf(ref);
        this.inCode.add(key);
        const id = this.ids.get(key);
        if (id === MULTI_GUILD) {
            this.multiGuild.set(key, ref);
            return undefined;
        }
        if (id === undefined) this.notDeployed.set(key, ref);
        return id;
    }

    private notInCode(): CommandRef[] {
        const extra = new Map<string, CommandRef>();
        for (const command of allDeployed(this.deploy)) {
            const key = keyOf(command);
            if (!this.inCode.has(key)) extra.set(key, { name: command.name, type: command.type });
        }
        return [...extra.values()];
    }
}

export function linkCommands(deploy: DeployResult, all: readonly CommandJson[]): LinkedCommands {
    return new CommandLinker(deploy).link(all);
}
