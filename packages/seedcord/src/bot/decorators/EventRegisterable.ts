import type { ConstructorFunction } from '@seedcord/types';
import type { ClientEvents } from 'discord.js';

export const EventMetadataKey = Symbol('event:metadata');

export function RegisterEvent<KeyofEvents extends keyof ClientEvents>(eventName: KeyofEvents) {
  return function (constructor: ConstructorFunction): void {
    Reflect.defineMetadata(EventMetadataKey, eventName, constructor);
  };
}
