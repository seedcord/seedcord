import type { ApplicationCommandType } from 'discord-api-types/v10';

/**
 * A slash or context-menu command row. `type` picks the per-kind map, `name` is the lookup key. For a
 * chat-input command with subcommands, `name` is the full route path (`'config/set'`), the same key
 * `@SlashRoute` registers.
 */
interface CommandRoute {
    readonly name: string;
    readonly type: ApplicationCommandType;
    /** Lazy import of the handler module, evaluated on first hit. */
    readonly load: () => Promise<unknown>;
}

/**
 * A button, select, or modal row. `kind` picks the per-kind map, `prefix` is the stable customId prefix
 * the receiver routes by (the routeKey minus its layout hash).
 */
export interface ComponentRoute {
    readonly kind:
        | 'button'
        | 'stringSelect'
        | 'userSelect'
        | 'roleSelect'
        | 'channelSelect'
        | 'mentionableSelect'
        | 'modal';
    readonly prefix: string;
    /** Lazy import of the handler module, evaluated on first hit. */
    readonly load: () => Promise<unknown>;
}

/**
 * An autocomplete row, its own route keyed by the command's route path, separate from the slash row.
 */
interface AutocompleteRoute {
    readonly name: string;
    /** Lazy import of the handler module, evaluated on first hit. */
    readonly load: () => Promise<unknown>;
}

/**
 * A bus subscriber row. The Bus routes off it without importing the subscriber module. The HTTP engine
 * ignores these rows until the Bus ships on this transport.
 */
interface SubscriberRoute {
    /** The subscription keys this subscriber registers for. */
    readonly keys: readonly string[];
    /** Mirrors the `@Subscribe` frequency metadata. */
    readonly frequency: 'on' | 'once';
    /** Lazy import of the subscriber module. */
    readonly load: () => Promise<unknown>;
}

/**
 * The static route table the HTTP engine dispatches through, replacing the filesystem handler scan that
 * cannot run in a bundled isolate. `seedcord build` emits it, the mount path authors it by hand.
 */
export interface RouteManifest {
    readonly commands: readonly CommandRoute[];
    readonly components: readonly ComponentRoute[];
    readonly autocomplete: readonly AutocompleteRoute[];
    readonly subscribers: readonly SubscriberRoute[];
}
