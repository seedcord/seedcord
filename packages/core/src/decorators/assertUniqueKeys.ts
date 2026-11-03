import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';

export function assertUniqueKeys(
    decorator: string,
    ctor: { name: string },
    keys: readonly string[],
    fix = 'Remove one of the two tuples.'
): void {
    const seen = new Set<string>();
    for (const key of keys) {
        if (seen.has(key)) {
            throw new SeedcordTypeError(SeedcordErrorCode.DecoratorDuplicateKey, [decorator, ctor.name, key, fix]);
        }
        seen.add(key);
    }
}
