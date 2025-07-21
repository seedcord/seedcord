import type { ConstructorFunction } from '../../library/types/Miscellaneous';
import type { BaseService } from '../BaseService';
import type { ServiceKeys } from '../types/Services';

export const ServiceMetadataKey = Symbol('db:serviceKey');

export function DatabaseService<TService extends ServiceKeys>(key: TService) {
  return <T extends ConstructorFunction & { prototype: BaseService }>(ctor: T): void => {
    Reflect.defineMetadata(ServiceMetadataKey, key, ctor);
  };
}
