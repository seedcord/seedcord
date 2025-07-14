import 'reflect-metadata';
import { Hooks } from '../interfaces/Hooks';
import { ConstructorFunction } from '../../library/types/Miscellaneous';

export const HookMetadataKey = Symbol('hook:metadata');

export function RegisterHook<T extends Hooks>(hook: T) {
  return function (constructor: ConstructorFunction) {
    Reflect.defineMetadata(HookMetadataKey, hook, constructor);
  };
}
