import { ModelMetadataKey } from './decorators/RegisterMongoModel';
import { ServiceMetadataKey } from './decorators/RegisterMongoService';

import type { Mongo } from './Mongo';
import type { MongoDocument } from './types/MongoDocument';
import type { MongoServices } from './types/MongoServices';
import type { TypedConstructor } from '@seedcord/types';
import type mongoose from 'mongoose';
import type { Core } from 'seedcord';

/**
 * Base class for MongoDB service layers
 *
 * Provides typed access to MongoDB collections through Mongoose models.
 * Services are automatically registered with the Mongo plugin when instantiated.
 *
 * @typeParam Doc - The document type this service manages
 * @example
 * ```typescript
 * \@RegisterMongoService('users')
 * export class Users extends MongoService<IUser> {
 *   \@RegisterMongoModel('users')
 *   public static schema = new mongoose.Schema<IUser>({
 *     username: { type: String, required: true, unique: true }
 *   });
 *
 *   // Custom methods here
 *   public async findByUsername(username: string) {
 *     return this.model.findOne({ username });
 *   }
 * }
 * ```
 */
export abstract class MongoService<Doc extends MongoDocument = MongoDocument> {
    public readonly model: mongoose.Model<Doc>;

    public constructor(
        protected readonly db: Mongo,
        protected readonly core: Core
    ) {
        const ctor = this.constructor;

        const key = Reflect.getMetadata(ServiceMetadataKey, ctor) as string | undefined;
        if (!key) throw new Error(`Missing @RegisterMongoService on ${ctor.name}`);

        const model = Reflect.getMetadata(ModelMetadataKey, ctor) as mongoose.Model<Doc> | undefined;
        if (!model) throw new Error(`Missing @RegisterMongoModel on ${ctor.name}`);

        this.model = model;

        db._register(key as keyof MongoServices, this as unknown as MongoServices[keyof MongoServices]);
    }
}

/** Constructor type for {@link MongoService} classes */
export type MongoServiceConstructor = TypedConstructor<typeof MongoService>;
