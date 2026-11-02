import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';

export function firstRepeat(keys: readonly string[]): string | undefined {
    const seen = new Set<string>();
    for (const key of keys) {
        if (seen.has(key)) return key;
        seen.add(key);
    }
    return undefined;
}

/** @internal */
export function assertUniqueKeys(decorator: string, ctor: { name: string }, keys: readonly string[]): void {
    const repeated = firstRepeat(keys);
    if (repeated !== undefined) {
        throw new SeedcordTypeError(SeedcordErrorCode.DecoratorDuplicateKey, [decorator, ctor.name, repeated]);
    }
}
