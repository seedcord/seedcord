import type { HookKeys } from '../types/Hooks';
import type { ConstructorFunction } from '@seedcord/types';

export const HookMetadataKey = Symbol('hook:metadata');

export function RegisterHook<THook extends HookKeys>(hook: THook) {
  return function (constructor: ConstructorFunction): void {
    Reflect.defineMetadata(HookMetadataKey, hook, constructor);
  };
}
