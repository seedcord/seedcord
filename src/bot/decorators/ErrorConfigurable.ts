import { ConstructorFunction } from '../../core/library/types/Miscellaneous';

export enum ErrorType {
  Key = 'error:key',
  Value = 'error:value'
}

/**
 * Decorator for marking a class as an "Error" class with a given key.
 */
export function ErrorKey(key: string) {
  return function (constructor: ConstructorFunction) {
    Reflect.defineMetadata(ErrorType.Key, key, constructor);
  };
}

/**
 * Decorator for marking a class as an "Embed" class with a given key.
 */
export function ErrorValue(key: string) {
  return function (constructor: ConstructorFunction) {
    Reflect.defineMetadata(ErrorType.Value, key, constructor);
  };
}
