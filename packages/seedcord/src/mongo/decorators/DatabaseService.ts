import type { BaseService } from '../BaseService';
import type { ServiceKeys } from '../types/Services';
import type { ConstructorFunction } from '@seedcord/types';

export const ServiceMetadataKey = Symbol('db:serviceKey');

export function DatabaseService<TService extends ServiceKeys>(key: TService) {
  return <DatabaseCtor extends ConstructorFunction & { prototype: BaseService }>(ctor: DatabaseCtor): void => {
    Reflect.defineMetadata(ServiceMetadataKey, key, ctor);
  };
}
