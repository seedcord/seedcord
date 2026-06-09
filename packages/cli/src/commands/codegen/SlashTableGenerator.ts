import { SeedcordErrorCode } from '@seedcord/services';
import { SeedcordError } from '@seedcord/services/internal';
import { buildSlashRoute } from '@seedcord/utils/internal';
import { ApplicationCommandOptionType } from 'discord.js';

import type { ILogger, OptionKind, SlashOption } from '@seedcord/types';
import type { APIApplicationCommandBasicOption, RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord.js';

/** One leaf's option set, keyed by option name. */
export type RouteOptions = Record<string, SlashOption>;

/** The full registry, keyed by route string (`cmd`, `cmd/sub`, or `cmd/group/sub`). */
export type SlashTables = Record<string, RouteOptions>;

/** A command discovered by the codegen scan, paired with its source path for diagnostics. */
export interface ScannedCommand {
    sourceFile: string;
    json: RESTPostAPIChatInputApplicationCommandsJSONBody;
}

type CommandOption = NonNullable<RESTPostAPIChatInputApplicationCommandsJSONBody['options']>[number];

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
            for (const [route, options] of this.leavesOf(command.json)) {
                // an interface registry merges duplicate keys silently, so the route collision must be caught here.
                const firstFile = sourceByRoute.get(route);
                if (firstFile !== undefined) {
                    throw new SeedcordError(SeedcordErrorCode.CliCodegenDuplicateRoute, [
                        route,
                        firstFile,
                        command.sourceFile
                    ]);
                }
                sourceByRoute.set(route, command.sourceFile);
                tables[route] = options;
            }
        }
        this.logger.debug(`Generated slash tables for ${Object.keys(tables).length} route(s)`);
        return tables;
    }

    // a command's options are EITHER all leaves OR all subs/groups (Discord forbids mixing), so any sub/group
    // means the root is not executable and only the leaves get a route.
    private leavesOf(json: RESTPostAPIChatInputApplicationCommandsJSONBody): [string, RouteOptions][] {
        const options = json.options ?? [];
        const hasRouting = options.some(
            (option) =>
                option.type === ApplicationCommandOptionType.Subcommand ||
                option.type === ApplicationCommandOptionType.SubcommandGroup
        );
        if (!hasRouting) return [[buildSlashRoute(json.name), this.mapOptions(options)]];

        const leaves: [string, RouteOptions][] = [];
        for (const option of options) {
            if (option.type === ApplicationCommandOptionType.SubcommandGroup) {
                const subs = option.options ?? [];
                // toJSON() does not reject an empty group, but Discord rejects it at deploy, so flag it here.
                if (subs.length === 0) {
                    // a group with no subcommands has no route leaf, so name it directly for the diagnostic.
                    this.logger.warn(
                        `Slash group \`${json.name}/${option.name}\` has no subcommands and will not deploy.`
                    );
                    continue;
                }
                for (const sub of subs) {
                    leaves.push([
                        buildSlashRoute(json.name, sub.name, option.name),
                        this.mapOptions(sub.options ?? [])
                    ]);
                }
            } else if (option.type === ApplicationCommandOptionType.Subcommand) {
                leaves.push([buildSlashRoute(json.name, option.name), this.mapOptions(option.options ?? [])]);
            }
        }
        return leaves;
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
