import 'reflect-metadata';
import type { ConstructorFunction } from '../../library/types/Miscellaneous';
import type { HookKeys } from '../types/Hooks';

export const HookMetadataKey = Symbol('hook:metadata');

export function RegisterHook<THook extends HookKeys>(hook: THook) {
  return function (constructor: ConstructorFunction): void {
    Reflect.defineMetadata(HookMetadataKey, hook, constructor);
  };
}
