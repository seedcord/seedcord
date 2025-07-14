import { UUID } from 'crypto';
import { Guild, User } from 'discord.js';

export interface HookedEvents {
  unknownException: [uuid: UUID, error: Error, guild: Guild, user: User];
}

export enum Hooks {
  UnknownException = 'unknownException'
}
