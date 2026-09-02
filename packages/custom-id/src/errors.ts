import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

/** Supply one constructor per failure. {@link CustomId.decode} throws whatever the matching one returns. */
export interface CustomIdErrors {
    /** Built when the wire's prefix matches and its layout hash differs. */
    stale(prefix: string): Error;
    /** Built when the wire is corrupt, truncated, or minted by a different definition. */
    invalid(detail: string): Error;
}

const defaults: CustomIdErrors = {
    stale: (prefix) => new SeedcordError(SeedcordErrorCode.CustomIdWireStale, [prefix]),
    invalid: (detail) => new SeedcordError(SeedcordErrorCode.CustomIdWireInvalid, [detail])
};

let active: CustomIdErrors = defaults;

/**
 * Replace what {@link CustomId.decode} throws. One registration covers the whole process. The last
 * call wins. Call this before any interaction is received.
 *
 * The stale constructor receives the route prefix. The invalid one receives a detail string. Neither
 * carries the interaction. A per-user locale cannot reach either one.
 *
 * A [seedcord](https://seedcord.org) bot already calls this at import, swapping both defaults for `Notice`
 * subclasses that render a card. Call it again with your own to change what the user reads. Return a
 * `Notice` subclass from each arm. A plain `Error` would otherwise reach the user as the generic fault card.
 *
 * @param errors - Constructors for the two failure cases.
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
