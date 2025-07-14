import { ConstructorFunction } from '../../library/types/Miscellaneous';
import { BaseService } from '../BaseService';
import { ValidServiceKey } from '../types/ServiceMap';

export const ServiceMetadataKey = Symbol('db:serviceKey');

export function DatabaseService(key: ValidServiceKey) {
  return <T extends ConstructorFunction & { prototype: BaseService }>(ctor: T): void => {
    Reflect.defineMetadata(ServiceMetadataKey, key, ctor);
  };
}
