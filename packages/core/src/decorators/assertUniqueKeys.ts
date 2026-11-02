import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';

/** @internal */
export function assertUniqueKeys(decorator: string, ctor: { name: string }, keys: readonly string[]): void {
    const seen = new Set<string>();
    for (const key of keys) {
        if (seen.has(key))
            throw new SeedcordTypeError(SeedcordErrorCode.DecoratorDuplicateKey, [decorator, ctor.name, key]);
        seen.add(key);
    }
}
