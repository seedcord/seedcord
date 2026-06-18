/**
 * Throw to stop a handler with no reply and no report.
 *
 * The framework boundary catches `Silence` before {@link Notice}, makes zero Discord calls, and stops.
 * Ideally you'd only throw this in `EventHandlers` (or `Gates` for those), because it doesn't make sense to
 * leave the user with no reply for an interaction.
 *
 * @example
 * ```ts
 * import { Silence } from '@seedcord/kit';
 *
 * // before any reply or defer, drop the interaction with no reply and no report
 * if (await isBlacklisted(interaction.user.id)) throw new Silence('blacklisted user');
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
