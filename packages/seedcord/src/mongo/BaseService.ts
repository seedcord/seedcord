import { ModelMetadataKey } from './decorators/DatabaseModel';
import { ServiceMetadataKey } from './decorators/DatabaseService';

import type { Mongo } from './Mongo';
import type { Services } from './types/Services';
import type { Core } from '../interfaces/Core';
import type { IDocument, TypedConstructor } from '@seedcord/types';
import type mongoose from 'mongoose';

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

export type BaseServiceConstructor = TypedConstructor<typeof BaseService>;
