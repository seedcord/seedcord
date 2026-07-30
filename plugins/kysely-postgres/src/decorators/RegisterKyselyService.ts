import type { KyselyTable } from '../types/KyselyDatabase';
import type { KyselyServiceRegistrationOptions } from '../types/KyselyServiceRegistrationOptions';
import type { KyselyServices, KyselyServiceKeys } from '../types/KyselyServices';
import type { Constructor } from 'type-fest';

export const KyselyServiceMetadataKey = Symbol('seedcord:kysely-postgres:service');
export const KyselyTableMetadataKey = Symbol('seedcord:kysely-postgres:table');

/**
 * Registers a Kysely Postgres service with the specified key and options.
 *
 * Associates a service class with a key for dependency injection.
 * The service becomes available via `core.db.services[key]`.
 *
 * @typeParam TKey - The service key type
 * @typeParam TTable - The table the service reads, defaulting to the key
 * @param key - Service key for registration and type-safe access
 * @param options - Additional registration options
 * @decorator
 * @example
 * ```typescript
 * \@RegisterKyselyService('users', { table: 'app_users' })
 * export class UsersService extends KyselyService<'app_users'> {
 *   // Some code
 * }
 * ```
 *
 * @see {@link KyselyService}
 */
export function RegisterKyselyService<
    TKey extends KyselyServiceKeys,
    TTable extends KyselyTable = TKey extends KyselyTable ? TKey : never
>(key: TKey, options?: KyselyServiceRegistrationOptions<TTable>) {
    // the `table` member pins the class to the same table the effective option resolves to
    return <Ctor extends Constructor<KyselyServices[TKey] & { table: TTable }>>(ctor: Ctor): void => {
        Reflect.defineMetadata(KyselyServiceMetadataKey, key, ctor);

        const tableName = options?.table ?? String(key);
        Reflect.defineMetadata(KyselyTableMetadataKey, tableName, ctor);
    };
}
