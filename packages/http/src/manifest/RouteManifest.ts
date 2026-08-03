import type { SelectMenuKind, SubscriptionKey } from '@seedcord/core';
import type { EventFrequency } from '@seedcord/types';
import type { ApplicationCommandType } from 'discord-api-types/v10';

/** The command kinds a manifest row registers, the wire enum's other members have no handler base. */
type RegistrableCommandType =
    | ApplicationCommandType.ChatInput
    | ApplicationCommandType.User
    | ApplicationCommandType.Message;

/** One file may export several handlers, so the row states which export it registers. */
export interface RouteModule {
    /** The exported binding inside the loaded module. */
    readonly exportName: string;
    /** The source file the row came from, reported when the export is missing. */
    readonly from: string;
    /** Lazy import of the module, evaluated on first hit. */
    readonly load: () => Promise<Record<string, unknown>>;
}

/**
 * A slash or context-menu command row. `type` picks the per-kind map, `name` is the lookup key. For a
 * chat-input command with subcommands, `name` is the full route path (`'config/set'`), the same key
 * `@SlashRoute` registers.
 */
interface CommandRoute extends RouteModule {
    readonly name: string;
    readonly type: RegistrableCommandType;
}

/**
 * A button, select, or modal row. `kind` picks the per-kind map, `prefix` is the stable customId prefix
 * the receiver routes by (the routeKey minus its layout hash).
 */
export interface ComponentRoute extends RouteModule {
    readonly kind: 'button' | `${SelectMenuKind}Select` | 'modal';
    readonly prefix: string;
}

/**
 * An autocomplete row, its own route keyed by the command's route path, separate from the slash row.
 */
interface AutocompleteRoute extends RouteModule {
    readonly name: string;
}

/**
 * A bus subscriber row. The Bus registers it without importing the subscriber module, and resolves the
 * class on the first publish of one of its keys.
 */
interface SubscriberRoute extends RouteModule {
    /** The subscription keys this subscriber registers for. */
    readonly keys: readonly SubscriptionKey[];
    /** Mirrors the `@Subscribe` frequency metadata. */
    readonly frequency: EventFrequency;
}

/** A middleware row. Middleware runs on every dispatch, so it carries no lookup key. */
type MiddlewareRoute = RouteModule;

/**
 * The static route table the HTTP engine dispatches through, replacing the filesystem handler scan that
 * cannot run in a bundled isolate. `seedcord build` emits it, the mount path authors it by hand.
 */
export interface RouteManifest {
    readonly commandRoutes: readonly CommandRoute[];
    readonly componentRoutes: readonly ComponentRoute[];
    readonly autocompleteRoutes: readonly AutocompleteRoute[];
    readonly subscriberRoutes: readonly SubscriberRoute[];
    readonly middlewareRoutes: readonly MiddlewareRoute[];
}

/** @internal */
export const EMPTY_MANIFEST: RouteManifest = {
    commandRoutes: [],
    componentRoutes: [],
    autocompleteRoutes: [],
    subscriberRoutes: [],
    middlewareRoutes: []
};
