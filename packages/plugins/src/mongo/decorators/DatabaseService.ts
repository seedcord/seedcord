import type { MongoServiceConstructor } from '../MongoService';
import type { ServiceKeys } from '../types/Services';

export const ServiceMetadataKey = Symbol('db:serviceKey');

/**
 * Registers a database service with a typed key
 *
 * Associates a service class with a key for dependency injection.
 * The service becomes available via `core.db.services[key]`.
 *
 * @typeParam TService - The service key type
 * @param key - Service key for registration and type-safe access
 * @decorator
 * @example
 * ```typescript
 * \@DatabaseService('users')
 * export class Users<Doc extends IUser = IUser> extends MongoService<Doc> {
 *   // Some code
 * }
 * ```
 */
export function DatabaseService<TService extends ServiceKeys>(key: TService) {
    return <DatabaseCtor extends MongoServiceConstructor>(ctor: DatabaseCtor): void => {
        Reflect.defineMetadata(ServiceMetadataKey, key, ctor);
    };
}
