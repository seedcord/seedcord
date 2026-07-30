import type { MongooseService } from '../MongooseService';
import type { MongooseServiceKeys } from '../types/MongooseServices';
import type { Constructor } from 'type-fest';

export const ServiceMetadataKey = Symbol('seedcord:mongoose:service');

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
 * \@RegisterMongooseService('users')
 * export class Users<Doc extends IUser = IUser> extends MongooseService<Doc> {
 *   // Some code
 * }
 * ```
 */
export function RegisterMongooseService<TService extends MongooseServiceKeys>(key: TService) {
    return <DatabaseCtor extends Constructor<unknown> & { prototype: MongooseService }>(ctor: DatabaseCtor): void => {
        Reflect.defineMetadata(ServiceMetadataKey, key, ctor);
    };
}
