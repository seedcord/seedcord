import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';

import type { MongooseServiceRegistrationOptions } from '../types/MongooseServiceRegistrationOptions';
import type { MongooseServiceKeys, MongooseServices } from '../types/MongooseServices';
import type mongoose from 'mongoose';
import type { Constructor } from 'type-fest';

export const ServiceMetadataKey = Symbol.for('seedcord:mongoose:service');
export const ModelNameMetadataKey = Symbol.for('seedcord:mongoose:model-name');

/**
 * Registers a database service with a typed key.
 *
 * Associates a service class with a key for dependency injection.
 * The service becomes available via `core.db.services[key]`.
 *
 * The decorated class declares its schema as a `public static schema` member, which the plugin
 * reads to build the model once the connection is open. A class without one is a compile error.
 *
 * @typeParam TService - The service key type
 * @param key - Service key for registration and type-safe access
 * @param options - Additional registration options
 * @decorator
 * @example
 * ```typescript
 * \@RegisterMongooseService('users')
 * export class Users extends MongooseService<IUser> {
 *   public static schema = new mongoose.Schema<IUser>({ username: { type: String, required: true } });
 * }
 * ```
 */
export function RegisterMongooseService<TService extends MongooseServiceKeys>(
    key: TService,
    options?: MongooseServiceRegistrationOptions
) {
    return <Ctor extends Constructor<MongooseServices[TService]> & { schema: mongoose.Schema }>(ctor: Ctor): void => {
        const modelName = options?.modelName ?? String(key);
        if (modelName.length === 0) {
            throw new SeedcordTypeError(SeedcordErrorCode.PluginMongooseModelNameMissing, [ctor.name]);
        }

        Reflect.defineMetadata(ServiceMetadataKey, key, ctor);
        Reflect.defineMetadata(ModelNameMetadataKey, modelName, ctor);
    };
}
