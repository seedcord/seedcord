import 'reflect-metadata';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError, SeedcordTypeError } from '@seedcord/errors/internal';

import { CommandMetadataKey } from '#src/metadataKeys';

import type { BuilderComponent } from '#components/Component';
import type { Constructor, LiteralUnion } from 'type-fest';

type CommandCtor = Constructor<BuilderComponent<'command' | 'context_menu'>>;

export const ConfigGuilds = 'config';

/** A guild id, or `'config'` for every id in `commands.guilds`. */
export type GuildTarget = LiteralUnion<typeof ConfigGuilds, string>;

interface GlobalMeta {
    scope: 'global';
}

interface GuildMeta {
    scope: 'guild';
    guilds: GuildTarget[];
}

interface ConfigMeta {
    scope: 'config';
}

export type CommandMeta = GlobalMeta | GuildMeta | ConfigMeta;

type CommandScope = CommandMeta['scope'];

/**
 * Registers a command in the guilds listed under `commands.guilds`. With no ids listed there, the
 * command deploys globally.
 *
 * @decorator
 * @example
 * ```typescript
 * \@RegisterCommand()
 * class PingCommand extends BuilderComponent<'command'> {} // or BuilderComponent<'context_menu'>
 * ```
 */
export function RegisterCommand(): (ctor: CommandCtor) => void;

/**
 * Registers a command globally, ignoring `commands.guilds`.
 *
 * @decorator
 * @example
 * ```typescript
 * \@RegisterCommand('global')
 * class PingCommand extends BuilderComponent<'command'> {} // or BuilderComponent<'context_menu'>
 * ```
 */
// eslint-disable-next-line @typescript-eslint/unified-signatures -- merging these puts two different deploy targets under one doc block
export function RegisterCommand(scope: 'global'): (ctor: CommandCtor) => void;

/**
 * Registers a command in the guilds you pass. These ids replace `commands.guilds`. Include
 * `'config'` among them to keep that list too.
 *
 * @decorator
 * @example
 * ```typescript
 * \@RegisterCommand('guild', ['config', '123456789'])
 * class AdminCommand extends BuilderComponent<'command'> {} // or BuilderComponent<'context_menu'>
 * ```
 */
export function RegisterCommand(scope: 'guild', guilds: GuildTarget[]): (ctor: CommandCtor) => void;

export function RegisterCommand(scope: CommandScope = 'config', guilds: GuildTarget[] = []) {
    return (ctor: CommandCtor): void => {
        const existingMeta = Reflect.getOwnMetadata(CommandMetadataKey, ctor) as CommandMeta | undefined;
        if (existingMeta) {
            throw new SeedcordError(SeedcordErrorCode.DecoratorCommandAlreadyRegistered, [
                ctor.name,
                decoratorCall(existingMeta.scope),
                decoratorCall(scope)
            ]);
        }

        if (scope === 'global' && guilds.length > 0) {
            throw new SeedcordTypeError(SeedcordErrorCode.DecoratorCommandGlobalWithGuilds);
        }

        if (scope === 'guild' && (!Array.isArray(guilds) || guilds.length === 0)) {
            throw new SeedcordTypeError(SeedcordErrorCode.DecoratorCommandGuildWithoutGuilds);
        }

        const meta: CommandMeta = scope === 'guild' ? { scope, guilds } : { scope };
        Reflect.defineMetadata(CommandMetadataKey, meta, ctor);
    };
}

function decoratorCall(scope: CommandScope): string {
    if (scope === 'global') return "@RegisterCommand('global')";
    if (scope === 'guild') return "@RegisterCommand('guild', [...])";

    return '@RegisterCommand()';
}
