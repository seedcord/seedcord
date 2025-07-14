import { ClientEvents } from 'discord.js';
import { ConstructorFunction } from '../../core/library/types/Miscellaneous';

export const EventMetadataKey = Symbol('event:metadata');

export function RegisterEvent<T extends keyof ClientEvents>(eventName: T) {
  return function (constructor: ConstructorFunction) {
    Reflect.defineMetadata(EventMetadataKey, eventName, constructor);
  };
}
