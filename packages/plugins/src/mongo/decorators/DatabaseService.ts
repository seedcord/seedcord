import type { BaseService } from '../BaseService';
import type { ServiceKeys } from '../types/Services';
import type { ConstructorFunction } from '@seedcord/types';

export const ServiceMetadataKey = Symbol('db:serviceKey');

/**
 * Registers a database service with a typed key
 *
 * Associates a service class with a key for dependency injection.
 * The service becomes available via `core.db.services[key]`.
 *
 * @param key - Service key for registration and type-safe access
 * @decorator
 * @example
 * ```typescript
 * \@DatabaseService('users')
 * export class Users<Doc extends IUser = IUser> extends BaseService<Doc> {
 *   // Some code
 * }
 * ```
 */
export function DatabaseService<TService extends ServiceKeys>(key: TService) {
    return <DatabaseCtor extends ConstructorFunction & { prototype: BaseService }>(ctor: DatabaseCtor): void => {
        Reflect.defineMetadata(ServiceMetadataKey, key, ctor);
    };
}
