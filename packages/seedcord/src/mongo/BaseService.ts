import { ModelMetadataKey } from './decorators/DatabaseModel';
import { ServiceMetadataKey } from './decorators/DatabaseService';

import type { Mongo } from './Mongo';
import type { Core } from '../interfaces/Core';
import type { Services } from './types/Services';
import type { IDocument, TypedConstructor } from '@seedcord/types';
import type mongoose from 'mongoose';

/**
 * Base class for MongoDB service layers
 *
 * Provides typed access to MongoDB collections through Mongoose models.
 * Services are automatically registered with the Mongo plugin when instantiated.
 *
 * @template Doc - The document type this service manages
 * @example
 * ```typescript
 * \@DatabaseService('users')
 * export class Users extends BaseService<IUser> {
 *   \@DatabaseModel('users')
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
export abstract class BaseService<Doc extends IDocument = IDocument> {
  public readonly model: mongoose.Model<Doc>;

  public constructor(
    protected readonly db: Mongo,
    protected readonly core: Core
  ) {
    const ctor = this.constructor;

    const key = Reflect.getMetadata(ServiceMetadataKey, ctor) as string | undefined;
    if (!key) throw new Error(`Missing @DatabaseService on ${ctor.name}`);

    const model = Reflect.getMetadata(ModelMetadataKey, ctor) as mongoose.Model<Doc> | undefined;
    if (!model) throw new Error(`Missing @DatabaseModel on ${ctor.name}`);

    this.model = model;

    db._register(key as keyof Services, this as unknown as Services[keyof Services]);
  }
}

/** Constructor type for BaseService classes */
export type BaseServiceConstructor = TypedConstructor<typeof BaseService>;
