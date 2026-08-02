import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

/**
 * Wraps a generated accessor's backing record so a read of an absent key throws. Handler modules import before
 * startup fills the record, and an unguarded read there returns `undefined` and renders as an empty string.
 *
 * @internal
 */
export function guardedAccessor<Value>(accessor: string, storage: Record<string, Value>): Record<string, Value> {
    return new Proxy(storage, {
        get(target, key, receiver): unknown {
            // hasOwn, since `in` walks the prototype and would read a key like `constructor` as resolved
            if (typeof key !== 'string' || Object.hasOwn(target, key)) return Reflect.get(target, key, receiver);
            throw new SeedcordError(SeedcordErrorCode.CoreAccessorUnresolved, [accessor, key]);
        }
    });
}
