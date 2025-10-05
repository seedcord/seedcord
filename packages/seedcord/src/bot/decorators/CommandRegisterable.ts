import type { BuilderComponent } from '../../interfaces/Components';

export const CommandMetadataKey = Symbol('command:metadata');

type CommandCtor = new (...args: any[]) => BuilderComponent<'command' | 'context_menu'>;

/**
 * Metadata for global command registration.
 */
interface GlobalMeta {
    scope: 'global';
}

/**
 * Metadata for guild-specific command registration.
 */
interface GuildMeta {
    scope: 'guild';
    guilds: string[];
}

/**
 * Union type for command registration metadata.
 */
export type CommandMeta = GlobalMeta | GuildMeta;

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

/**
 * Registers a command with Discord's application command system.
 *
 * @param scope - Registration scope: 'global' or 'guild'
 * @param guilds - Guild IDs for guild-scoped registration
 * @decorator
 */
export function RegisterCommand(scope: 'global' | 'guild', guilds: string[] = []) {
    return (ctor: CommandCtor): void => {
        const meta: GlobalMeta | GuildMeta = scope === 'global' ? { scope } : { scope, guilds };
        Reflect.defineMetadata(CommandMetadataKey, meta, ctor);
    };
}
