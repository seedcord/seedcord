import { SeedcordErrorCode } from '@seedcord/services';
import { SeedcordError } from '@seedcord/services/internal';
import { routeLeavesOf, type SlashRouteLeaf } from '@seedcord/utils/internal';
import { ApplicationCommandOptionType } from 'discord-api-types/v10';

import type { ILogger, OptionKind, SlashOption } from '@seedcord/types';
import type {
    APIApplicationCommandBasicOption,
    RESTPostAPIChatInputApplicationCommandsJSONBody
} from 'discord-api-types/v10';

/** One leaf's option set, keyed by option name. */
export type RouteOptions = Record<string, SlashOption>;

/** The full registry, keyed by route string (`cmd`, `cmd/sub`, or `cmd/group/sub`). */
export type SlashTables = Record<string, RouteOptions>;

/** A command discovered by the codegen scan, paired with its source path for diagnostics. */
export interface ScannedCommand {
    sourceFile: string;
    json: RESTPostAPIChatInputApplicationCommandsJSONBody;
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
 * Builds the typed slash-option tables from each command's `toJSON()`.
 *
 * The discord.js builder is the single source of truth, codegen reads it back because djs erases option
 * names at the type level. Route leaves match `buildSlashRoute`'s `cmd` / `cmd/sub` / `cmd/group/sub` strings.
 */
export class SlashTableGenerator {
    constructor(private readonly logger: ILogger) {}

    /** Walk every command into its route-keyed option tables. */
    public generate(commands: readonly ScannedCommand[]): SlashTables {
        const tables: SlashTables = {};
        const sourceByRoute = new Map<string, string>();
        for (const command of commands) {
            this.warnEmptyGroups(command.json);
            for (const leaf of routeLeavesOf(command.json)) {
                // an interface registry merges duplicate keys silently, so the route collision must be caught here.
                const firstFile = sourceByRoute.get(leaf.route);
                if (firstFile !== undefined) {
                    throw new SeedcordError(SeedcordErrorCode.CliCodegenDuplicateRoute, [
                        leaf.route,
                        firstFile,
                        command.sourceFile
                    ]);
                }
                sourceByRoute.set(leaf.route, command.sourceFile);
                tables[leaf.route] = this.mapOptions(leaf.options);
            }
        }
        this.logger.debug(`Generated slash tables for ${Object.keys(tables).length} route(s)`);
        return tables;
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

            const choices =
                'choices' in option && option.choices ? option.choices.map((choice) => choice.value) : undefined;
            table[option.name] = {
                kind: KIND_BY_TYPE[option.type],
                required: option.required ?? false,
                ...(choices ? { choices } : {})
            };
        }
        return table;
    }
}
