import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

/** Supply one constructor per failure. {@link CustomId.decode} throws whatever the matching one returns. */
export interface CustomIdErrors {
    /** Called when the wire's prefix matches but its layout hash differs. */
    stale(prefix: string): Error;
    /** Called when the wire is corrupt, truncated, or came from a different definition. */
    invalid(detail: string): Error;
}

const defaults: CustomIdErrors = {
    stale: (prefix) => new SeedcordError(SeedcordErrorCode.CustomIdWireStale, [prefix]),
    invalid: (detail) => new SeedcordError(SeedcordErrorCode.CustomIdWireInvalid, [detail])
};

let active: CustomIdErrors = defaults;

/**
 * Replace the errors that {@link CustomId.decode} throws. The setting is process-wide and the last
 * call wins, so call it before your bot receives any interaction.
 *
 * `stale` gets the route prefix and `invalid` gets a detail string. Neither one gets the interaction,
 * so you can't localize the message per user.
 *
 * A [seedcord](https://seedcord.org) bot already calls this at import and replaces both defaults with
 * `Notice` subclasses that render a card. To change what the user reads, call it again with your own and
 * return a `Notice` subclass from each callback. A plain `Error` reaches the user as the generic fault card.
 *
 * @example
 * ```ts
 * class StaleButton extends Error {}
 * class BrokenButton extends Error {}
 *
 * setCustomIdErrors({
 *     stale: (prefix) => new StaleButton(`${prefix} came from an older deploy`),
 *     invalid: (detail) => new BrokenButton(detail)
 * });
 * ```
 */
export function setCustomIdErrors(errors: CustomIdErrors): void {
    active = errors;
}

export function staleError(prefix: string): Error {
    return active.stale(prefix);
}

export function invalidError(detail: string): Error {
    return active.invalid(detail);
}
