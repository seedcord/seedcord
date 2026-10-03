import type { HandlerConstructor, InteractionMiddlewareConstructor } from '#handlers/constructors';
import type { StoredSubscriberCtor } from '@seedcord/core/internal';

/**
 * The classes a bundled isolate registers at startup, standing in for the filesystem scan an isolate
 * cannot run. `seedcord build` emits it for an edge bot. A hand-mounted host writes it.
 */
export interface Manifest {
    readonly handlers: readonly HandlerConstructor[];
    readonly middleware: readonly InteractionMiddlewareConstructor[];
    readonly subscribers: readonly StoredSubscriberCtor[];
}
