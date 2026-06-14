import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import type { BuilderComponent } from '@interfaces/Components';
import type { Constructor } from 'type-fest';

/**
 * Metadata key for command registration information.
 *
 * @internal
 */
export const CommandMetadataKey = Symbol('command:metadata');

/**
 * Constructor type for command classes.
 *
 * @internal
 */
export type CommandCtor = Constructor<BuilderComponent<'command' | 'context_menu'>>;

/**
 * Metadata for global command registration.
 *
 * @internal
 */
export interface GlobalMeta {
    scope: 'global';
}

/**
 * Metadata for guild-specific command registration.
 *
 * @internal
 */
export interface GuildMeta {
    scope: 'guild';
    guilds: string[];
}

/**
 * Union type for command registration metadata.
 *
 * @internal
 */
export type CommandMeta = GlobalMeta | GuildMeta;

/**
 * Type representing command registration scope.
 *
 * @internal
 */
export type CommandScope = CommandMeta['scope'];

/**
 * Registers a command for global deployment.
 *
 * @param scope - Must be 'global' for global registration
 * @decorator
 * @example
 * ```typescript
 * \@RegisterCommand('global')
 * class PingCommand extends BuilderComponent {
 *   // Global command
 * }
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
 * class AdminCommand extends BuilderComponent {
 *   // Guild-specific command
 * }
 * ```
 */
export function RegisterCommand(scope: 'guild', guilds: string[]): (ctor: CommandCtor) => void;

export function RegisterCommand(scope: CommandScope, guilds: string[] = []) {
    return (ctor: CommandCtor): void => {
        const meta: GlobalMeta | GuildMeta = scope === 'global' ? { scope } : { scope, guilds };

        // Reject a second @RegisterCommand on the same class.
        const existingMeta = Reflect.getOwnMetadata(CommandMetadataKey, ctor) as CommandMeta | undefined;
        if (existingMeta) {
            throw new SeedcordError(SeedcordErrorCode.DecoratorCommandAlreadyRegistered, [
                ctor.name,
                existingMeta.scope,
                scope
            ]);
        }

        // Also make sure guilds aren't provided for global scope
        if (scope === 'global' && guilds.length > 0) {
            throw new SeedcordError(SeedcordErrorCode.DecoratorCommandGlobalWithGuilds);
        }

        // Also make sure guilds are provided for guild scope
        if (scope === 'guild' && (!Array.isArray(guilds) || guilds.length === 0)) {
            throw new SeedcordError(SeedcordErrorCode.DecoratorCommandGuildWithoutGuilds);
        }

        Reflect.defineMetadata(CommandMetadataKey, meta, ctor);
    };
}
