import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { CommandMetadataKey } from '@src/metadataKeys';

import type { BuilderComponent } from '@components/Component';
import type { Constructor } from 'type-fest';

/** @internal */
type CommandCtor = Constructor<BuilderComponent<'command' | 'context_menu'>>;

/** @internal */
interface GlobalMeta {
    scope: 'global';
}

/** @internal */
interface GuildMeta {
    scope: 'guild';
    guilds: string[];
}

/** @internal */
export type CommandMeta = GlobalMeta | GuildMeta;

/** @internal */
type CommandScope = CommandMeta['scope'];

/**
 * Attaches deployment metadata so the framework registers this command globally or in specific guilds.
 *
 * @param scope - Must be 'global' for global registration
 * @decorator
 * @example
 * ```typescript
 * \@RegisterCommand('global')
 * class PingCommand extends BuilderComponent<'command'> {} // or BuilderComponent<'context_menu'>
 * ```
 */
export function RegisterCommand(scope: 'global'): (ctor: CommandCtor) => void;

/**
 * Registers a command for specific guild deployment.
 *
 * @param scope - Must be 'guild' for guild-specific registration
 * @param guilds - Array of guild IDs where the command should be registered
 * @decorator
 * @example
 * ```typescript
 * \@RegisterCommand('guild', ['123456789'])
 * class AdminCommand extends BuilderComponent<'command'> {} // or BuilderComponent<'context_menu'>
 * ```
 */
export function RegisterCommand(scope: 'guild', guilds: string[]): (ctor: CommandCtor) => void;

export function RegisterCommand(scope: CommandScope, guilds: string[] = []) {
    return (ctor: CommandCtor): void => {
        const existingMeta = Reflect.getOwnMetadata(CommandMetadataKey, ctor) as CommandMeta | undefined;
        if (existingMeta) {
            throw new SeedcordError(SeedcordErrorCode.DecoratorCommandAlreadyRegistered, [
                ctor.name,
                existingMeta.scope,
                scope
            ]);
        }

        if (scope === 'global' && guilds.length > 0) {
            throw new SeedcordError(SeedcordErrorCode.DecoratorCommandGlobalWithGuilds);
        }

        if (scope === 'guild' && (!Array.isArray(guilds) || guilds.length === 0)) {
            throw new SeedcordError(SeedcordErrorCode.DecoratorCommandGuildWithoutGuilds);
        }

        const meta: GlobalMeta | GuildMeta = scope === 'global' ? { scope } : { scope, guilds };
        Reflect.defineMetadata(CommandMetadataKey, meta, ctor);
    };
}
