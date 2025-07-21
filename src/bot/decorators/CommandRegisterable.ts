import type { BuilderComponent } from '../interfaces/Components';

export const CommandMetadataKey = Symbol('command:metadata');

type CommandCtor = new (...args: any[]) => BuilderComponent<'command'>;

interface GlobalMeta {
  scope: 'global';
}

interface GuildMeta {
  scope: 'guild';
  guilds: string[];
}

export type CommandMeta = GlobalMeta | GuildMeta;

export function RegisterCommand(scope: 'global'): (ctor: CommandCtor) => void;
export function RegisterCommand(scope: 'guild', guilds: string[]): (ctor: CommandCtor) => void;
export function RegisterCommand(scope: 'global' | 'guild', guilds: string[] = []) {
  return (ctor: CommandCtor): void => {
    const meta: GlobalMeta | GuildMeta = scope === 'global' ? { scope } : { scope, guilds };
    Reflect.defineMetadata(CommandMetadataKey, meta, ctor);
  };
}
