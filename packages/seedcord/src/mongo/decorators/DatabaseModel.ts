import mongoose from 'mongoose';

import type { ServiceKeys } from '../types/Services';

export const ModelMetadataKey = Symbol('db:model');

export function DatabaseModel<TService extends ServiceKeys>(collection: TService) {
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
