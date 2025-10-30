import mongoose from 'mongoose';

import type { MongoServiceKeys } from '../types/MongoServices';

export const ModelMetadataKey = Symbol('db:model');

/**
 * Associates a Mongoose model with a database service
 *
 * Creates a Mongoose model from the decorated static schema property and stores it
 * for service registration. The model becomes available as `this.model` in the service.
 * Must be applied to a `public static schema` property in the service class.
 *
 * @typeParam TService - The service key type
 * @param collection - Collection name for the Mongoose model
 * @decorator
 * @example
 * ```typescript
 * \@RegisterMongoService('users')
 * export class Users extends MongoService<IUser> {
 *   \@RegisterMongoModel('users')
 *   public static schema = new mongoose.Schema<IUser>({
 *     username: { type: String, required: true, unique: true }
 *   });
 * }
 * ```
 */
export function RegisterMongoModel<TService extends MongoServiceKeys>(collection: TService) {
    return <
        SchemaObj extends Record<KeyOfSchema, mongoose.Schema>,
        KeyOfSchema extends keyof SchemaObj & (string | symbol)
    >(
        target: SchemaObj,
        propertyKey: KeyOfSchema
    ): void => {
        const schema = target[propertyKey];
        const name = String(collection);
        const model = mongoose.model(name, schema);
        Reflect.defineMetadata(ModelMetadataKey, model, target);
    };
}
