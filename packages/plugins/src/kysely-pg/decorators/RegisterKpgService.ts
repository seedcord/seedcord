import type { KpgServiceRegistrationOptions } from '../types/KpgServiceRegistrationOptions';
import type { KpgServices, KpgServiceKeys } from '../types/KpgServices';
import type { Constructor } from 'type-fest';

export const PgServiceMetadataKey = Symbol('db:pgServiceKey');
export const PgTableMetadataKey = Symbol('db:pgTable');

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
 * \@RegisterKpgService('users', { table: 'app_users' })
 * export class UsersService extends KpgService<{ users: IUser }, 'users'> {
 *   // Some code
 * }
 * ```
 *
 * @see {@link KpgService}
 */
export function RegisterKpgService<TKey extends KpgServiceKeys>(key: TKey, options?: KpgServiceRegistrationOptions) {
    return <Ctor extends Constructor<KpgServices[TKey]>>(ctor: Ctor): void => {
        Reflect.defineMetadata(PgServiceMetadataKey, key, ctor);

        const tableName = options?.table ?? String(key);
        Reflect.defineMetadata(PgTableMetadataKey, tableName, ctor);
    };
}
