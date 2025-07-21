import mongoose from 'mongoose';

import type { ServiceKeys } from '../types/Services';

export const ModelMetadataKey = Symbol('db:model');

export function DatabaseModel<TService extends ServiceKeys>(collection: TService) {
  return <T extends Record<K, mongoose.Schema>, K extends keyof T & (string | symbol)>(
    target: T,
    propertyKey: K
  ): void => {
    const schema = target[propertyKey];
    const name = String(collection);
    const model = mongoose.model(name, schema);
    Reflect.defineMetadata(ModelMetadataKey, model, target);
  };
}
