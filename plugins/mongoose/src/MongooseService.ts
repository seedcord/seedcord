import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { ServiceMetadataKey } from './decorators/RegisterMongooseService';

import type { Mongoose } from './Mongoose';
import type { MongooseDocument } from './types/MongooseDocument';
import type { CoreBase } from '@seedcord/core';
import type { TypedConstructor } from '@seedcord/types';
import type mongoose from 'mongoose';

/**
 * Base class for MongoDB service layers
 *
 * Provides typed access to MongoDB collections through Mongoose models.
 * Services are automatically registered with the Mongoose plugin when instantiated.
 *
 * @typeParam Doc - The document type this service manages
 * @example
 * ```typescript
 * \@RegisterMongooseService('users')
 * export class Users extends MongooseService<IUser> {
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
export abstract class MongooseService<Doc extends MongooseDocument = MongooseDocument> {
    public constructor(
        protected readonly db: Mongoose,
        protected readonly core: CoreBase,
        public readonly model: mongoose.Model<Doc>
    ) {
        const ctor = this.constructor;

        const key = Reflect.getMetadata(ServiceMetadataKey, ctor) as string | undefined;
        if (!key) {
            throw new SeedcordError(SeedcordErrorCode.PluginMongooseServiceDecoratorMissing, [ctor.name]);
        }

        db._register(key, this);
    }
}

/** Constructor type for {@link MongooseService} classes */
export type MongooseServiceConstructor = TypedConstructor<typeof MongooseService> & {
    schema: mongoose.Schema<MongooseDocument>;
};
