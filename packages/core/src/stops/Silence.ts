/**
 * Throw to stop a handler with no reply and no report.
 *
 * The framework boundary catches `Silence` before {@link Notice}, makes zero Discord calls, and stops.
 * Ideally you'd only throw this in `EventHandlers` (or `Gates` for those), because it doesn't make sense to
 * leave the user with no reply for an interaction.
 *
 * @example
 * ```ts
 * import { Silence } from '@seedcord/gateway';
 *
 * // a helper under a guildMemberAdd handler, stopping when this guild configured nothing to send
 * const template = await settings.welcome(member.guild.id);
 * if (!template) throw new Silence('no welcome message set');
 * ```
 */
export class Silence extends Error {
    /**
     * @param reason - Optional note written only to a debug log, never shown to the user or reported.
     */
    public constructor(public readonly reason?: string) {
        super(reason ?? 'Silence');

        Error.captureStackTrace(this, this.constructor);
    }
}
