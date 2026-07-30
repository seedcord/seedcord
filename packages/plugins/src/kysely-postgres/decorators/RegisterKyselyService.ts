import type { KyselyServiceRegistrationOptions } from '../types/KyselyServiceRegistrationOptions';
import type { KyselyServices, KyselyServiceKeys } from '../types/KyselyServices';
import type { Constructor } from 'type-fest';

export const KyselyServiceMetadataKey = Symbol('seedcord:kysely-postgres:service');
export const KyselyTableMetadataKey = Symbol('seedcord:kysely-postgres:table');

/**
 *
 * Registers a Kysely PG service with the specified key and options.
 *
 * Associates a service class with a key for dependency injection.
 * The service becomes available via `core.db.services[key]`.
 *
 * @typeParam TKey - The service key type
 * @param key - Service key for registration and type-safe access
 * @param options - Additional registration options
 * @decorator
 * @example
 * ```typescript
 * \@RegisterKyselyService('users', { table: 'app_users' })
 * export class UsersService extends KyselyService<{ users: IUser }, 'users'> {
 *   // Some code
 * }
 * ```
 *
 * @see {@link KyselyService}
 */
export function RegisterKyselyService<TKey extends KyselyServiceKeys>(
    key: TKey,
    options?: KyselyServiceRegistrationOptions
) {
    return <Ctor extends Constructor<KyselyServices[TKey]>>(ctor: Ctor): void => {
        Reflect.defineMetadata(KyselyServiceMetadataKey, key, ctor);

        const tableName = options?.table ?? String(key);
        Reflect.defineMetadata(KyselyTableMetadataKey, tableName, ctor);
    };
}
