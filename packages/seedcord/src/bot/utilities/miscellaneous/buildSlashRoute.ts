import { ChatInputCommandInteraction, AutocompleteInteraction } from 'discord.js';
/**
 * Route string computed from provided parts.
 *
 * @typeParam Cmmd - Main command name
 * @typeParam Subc - Subcommand name
 * @typeParam Grp - Group name (will be ignored if subcommand is not provided with it)
 */
export type CommandRouteString<
    Cmmd extends string,
    Subc extends string | undefined,
    Grp extends string | undefined
> = Subc extends string ? (Grp extends string ? `${Cmmd}/${Grp}/${Subc}` : `${Cmmd}/${Subc}`) : Cmmd;

/**
 * From provided positional arguments. Either provide the route to either {@link SlashRoute} or {@link AutocompleteRoute} manually, or use this utility to build it.
 *
 * @param command - Main command name
 * @param subcommand - Optional subcommand name
 * @param group - Optional group name (will be ignored if subcommand is not provided with it)
 */
export function buildSlashRoute<
    Cmmd extends string,
    Subc extends string | undefined = undefined,
    Grp extends string | undefined = undefined
>(command: Cmmd, subcommand?: Subc, group?: Grp): CommandRouteString<Cmmd, Subc, Grp>;

/**
 * From a Discord interaction. The {@link InteractionController} uses this internally to build the route string to then route the correct handler.
 *
 * @internal
 */
export function buildSlashRoute(interaction: ChatInputCommandInteraction | AutocompleteInteraction): string;

// Implementation
export function buildSlashRoute(
    arg1: ChatInputCommandInteraction | AutocompleteInteraction | string,
    arg2?: string,
    arg3?: string
): string {
    let command: string;
    let sub: string | undefined;
    let group: string | undefined;

    if (typeof arg1 === 'string') {
        command = arg1;
        sub = arg2;
        group = arg3;
    } else if (arg1 instanceof ChatInputCommandInteraction || arg1 instanceof AutocompleteInteraction) {
        command = arg1.commandName;
        group = arg1.options.getSubcommandGroup(false) ?? undefined;
        sub = arg1.options.getSubcommand(false) ?? undefined;
    } else {
        throw new TypeError('Invalid argument passed to buildSlashRoute');
    }

    if (sub && group) return `${command}/${group}/${sub}`;
    if (sub) return `${command}/${sub}`;
    return command;
}
