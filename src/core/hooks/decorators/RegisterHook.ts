import 'reflect-metadata';
import { HookKeys } from '../types/Hooks';
import { ConstructorFunction } from '../../library/types/Miscellaneous';

export const HookMetadataKey = Symbol('hook:metadata');

export function RegisterHook<THook extends HookKeys>(hook: THook) {
  return function (constructor: ConstructorFunction) {
    Reflect.defineMetadata(HookMetadataKey, hook, constructor);
  };
}
