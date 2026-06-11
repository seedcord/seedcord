/**
 * Joins a command name with an optional subcommand and group into a slash route string. seedcord's
 * interaction dispatch and `seedcord codegen` both build route keys through this, so the two formats
 * cannot diverge.
 *
 * @param command - The top-level command name.
 * @param subcommand - The subcommand name, when the command has subcommands.
 * @param group - The subcommand group name, applied only alongside a subcommand.
 * @returns `command`, `command/subcommand`, or `command/group/subcommand`.
 */
export function buildSlashRoute(command: string, subcommand?: string, group?: string): string {
    if (subcommand && group) return `${command}/${group}/${subcommand}`;
    if (subcommand) return `${command}/${subcommand}`;
    return command;
}
