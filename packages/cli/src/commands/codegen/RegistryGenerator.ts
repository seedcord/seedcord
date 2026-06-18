import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { routeLeavesOf, type SlashRouteLeaf } from '@seedcord/utils/internal';
import { ApplicationCommandOptionType, ApplicationCommandType } from 'discord-api-types/v10';

import type { ILogger, OptionKind, SlashOption } from '@seedcord/types';
import type {
    APIApplicationCommandBasicOption,
    RESTPostAPIApplicationCommandsJSONBody,
    RESTPostAPIChatInputApplicationCommandsJSONBody,
    RESTPostAPIContextMenuApplicationCommandsJSONBody
} from 'discord-api-types/v10';

/** One leaf's option set, keyed by option name. */
export type RouteOptions = Record<string, SlashOption>;

/** The slash tables, keyed by route string (`cmd`, `cmd/sub`, or `cmd/group/sub`). */
export type SlashTables = Record<string, RouteOptions>;

/** Everything codegen emits into the generated file, the slash option tables plus the two context-menu name sets. */
export interface GeneratedRegistry {
    slash: SlashTables;
    userContextMenus: string[];
    messageContextMenus: string[];
}

/** A command discovered by the codegen scan, paired with its source path for diagnostics. */
export interface ScannedCommand {
    sourceFile: string;
    json: RESTPostAPIApplicationCommandsJSONBody;
}

type CommandOption = SlashRouteLeaf['options'][number];

// keyed by the djs enum so a renamed member breaks here, and constrained to the full set of basic option
// types so a new upstream option kind fails to satisfy until it is mapped.
const KIND_BY_TYPE = {
    [ApplicationCommandOptionType.String]: 'string',
    [ApplicationCommandOptionType.Integer]: 'integer',
    [ApplicationCommandOptionType.Number]: 'number',
    [ApplicationCommandOptionType.Boolean]: 'boolean',
    [ApplicationCommandOptionType.User]: 'user',
    [ApplicationCommandOptionType.Channel]: 'channel',
    [ApplicationCommandOptionType.Role]: 'role',
    [ApplicationCommandOptionType.Mentionable]: 'mentionable',
    [ApplicationCommandOptionType.Attachment]: 'attachment'
} as const satisfies Record<APIApplicationCommandBasicOption['type'], OptionKind>;

/**
 * Builds the generated registry from each command's `toJSON()`. Chat-input commands become the slash-option
 * tables, context-menu commands contribute their name to the user or message set. Reads the builder back
 * because djs erases option names at the type level.
 */
export class RegistryGenerator {
    constructor(private readonly logger: ILogger) {}

    public generate(commands: readonly ScannedCommand[]): GeneratedRegistry {
        const slash: SlashTables = {};
        const sourceByRoute = new Map<string, string>();
        const sourceByUserName = new Map<string, string>();
        const sourceByMessageName = new Map<string, string>();

        for (const command of commands) {
            const { json } = command;
            if (json.type === ApplicationCommandType.User) {
                this.collectContextMenu('user', json, command.sourceFile, sourceByUserName);
            } else if (json.type === ApplicationCommandType.Message) {
                this.collectContextMenu('message', json, command.sourceFile, sourceByMessageName);
            } else if (json.type === undefined || json.type === ApplicationCommandType.ChatInput) {
                this.collectSlash(json, command.sourceFile, slash, sourceByRoute);
            }
        }

        const userContextMenus = [...sourceByUserName.keys()];
        const messageContextMenus = [...sourceByMessageName.keys()];
        this.logger.debug(
            `Generated ${Object.keys(slash).length} slash route(s), ${userContextMenus.length} user and ${messageContextMenus.length} message context-menu command(s)`
        );
        return { slash, userContextMenus, messageContextMenus };
    }

    private collectSlash(
        json: RESTPostAPIChatInputApplicationCommandsJSONBody,
        sourceFile: string,
        slash: SlashTables,
        sourceByRoute: Map<string, string>
    ): void {
        this.warnEmptyGroups(json);
        for (const leaf of routeLeavesOf(json)) {
            // an interface registry merges duplicate keys silently, so the route collision must be caught here.
            const firstFile = sourceByRoute.get(leaf.route);
            if (firstFile !== undefined) {
                throw new SeedcordError(SeedcordErrorCode.CliCodegenDuplicateRoute, [
                    leaf.route,
                    firstFile,
                    sourceFile
                ]);
            }
            sourceByRoute.set(leaf.route, sourceFile);
            slash[leaf.route] = this.mapOptions(leaf.options);
        }
    }

    // each kind dedupes against its own map, a same-kind clash would merge silently
    private collectContextMenu(
        kind: 'user' | 'message',
        json: RESTPostAPIContextMenuApplicationCommandsJSONBody,
        sourceFile: string,
        sourceByName: Map<string, string>
    ): void {
        const firstFile = sourceByName.get(json.name);
        if (firstFile !== undefined) {
            throw new SeedcordError(SeedcordErrorCode.CliCodegenDuplicateContextMenu, [
                kind,
                json.name,
                firstFile,
                sourceFile
            ]);
        }
        sourceByName.set(json.name, sourceFile);
    }

    // routeLeavesOf drops an empty group silently because it has no route. toJSON() allows one, but Discord
    // rejects it at deploy, so surface it here where the command's source file is known.
    private warnEmptyGroups(json: RESTPostAPIChatInputApplicationCommandsJSONBody): void {
        for (const option of json.options ?? []) {
            if (option.type === ApplicationCommandOptionType.SubcommandGroup && (option.options ?? []).length === 0) {
                this.logger.warn(`Slash group \`${json.name}/${option.name}\` has no subcommands and will not deploy.`);
            }
        }
    }

    private mapOptions(options: readonly CommandOption[]): RouteOptions {
        const table: RouteOptions = {};
        for (const option of options) {
            if (
                option.type === ApplicationCommandOptionType.Subcommand ||
                option.type === ApplicationCommandOptionType.SubcommandGroup
            ) {
                continue;
            }

            // empty choices would narrow the value to never
            const choices =
                'choices' in option && option.choices && option.choices.length > 0
                    ? option.choices.map((choice) => choice.value)
                    : undefined;
            const autocomplete = 'autocomplete' in option && option.autocomplete === true ? true : undefined;
            table[option.name] = {
                kind: KIND_BY_TYPE[option.type],
                required: option.required ?? false,
                ...(choices ? { choices } : {}),
                ...(autocomplete ? { autocomplete } : {})
            };
        }
        return table;
    }
}
