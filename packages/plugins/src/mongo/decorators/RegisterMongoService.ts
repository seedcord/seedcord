import type { MongoService } from '../MongoService';
import type { MongoServiceKeys } from '../types/MongoServices';
import type { Constructor } from 'type-fest';

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
 * \@RegisterMongoService('users')
 * export class Users<Doc extends IUser = IUser> extends MongoService<Doc> {
 *   // Some code
 * }
 * ```
 */
export function RegisterMongoService<TService extends MongoServiceKeys>(key: TService) {
    return <DatabaseCtor extends Constructor<unknown> & { prototype: MongoService }>(ctor: DatabaseCtor): void => {
        Reflect.defineMetadata(ServiceMetadataKey, key, ctor);
    };
}
