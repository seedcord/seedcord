/**
 * Throw to stop a handler with no reply and no report.
 *
 * The framework boundary catches `Halt` before {@link Denial}, makes zero Discord calls, and stops.
 * Use it for a blacklist drop or a quiet filter where replying would leak information. Throw it before
 * any reply or defer, because throwing after a defer leaves the user with a hanging spinner.
 */
export class Halt extends Error {
    /**
     * Creates a Halt.
     *
     * @param reason - Optional note written only to a debug log, never shown to the user or reported.
     */
    public constructor(public readonly reason?: string) {
        super(reason ?? 'Halt');

        Error.captureStackTrace(this, this.constructor);
    }
}
