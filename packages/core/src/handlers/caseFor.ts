import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';

export function caseFor<Case extends (...args: never[]) => unknown>(
    handler: object,
    cases: object,
    kind: string,
    value: string
): Case {
    // hasOwn, since a plain lookup for a key named `constructor` returns Object.prototype's
    const callback = Object.hasOwn(cases, value) ? (cases as Record<string, unknown>)[value] : undefined;
    if (typeof callback !== 'function')
        throw new SeedcordTypeError(SeedcordErrorCode.MatchCaseMissing, [handler.constructor.name, kind, value]);
    // justified: each match() types its cases as one function per key
    return callback as Case;
}
