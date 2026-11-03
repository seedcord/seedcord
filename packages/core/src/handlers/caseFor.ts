import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';

export function caseFor<Cases extends object, Key extends keyof Cases & string>(
    handler: object,
    cases: Cases,
    kind: string,
    value: Key
): Cases[Key] {
    // hasOwn, since a plain lookup for a key named `constructor` returns Object.prototype's
    const callback = Object.hasOwn(cases, value) ? cases[value] : undefined;
    if (typeof callback !== 'function')
        throw new SeedcordTypeError(SeedcordErrorCode.MatchCaseMissing, [handler.constructor.name, kind, value]);
    return callback;
}
