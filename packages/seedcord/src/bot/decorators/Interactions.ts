import { ComponentDefsKey } from '@customId/routing';
import { areRoutes } from '@miscellaneous/areRoutes';

import type { AnyCustomId } from '@customId/CustomId';
import type { HasComponentDefs } from '@customId/routing';
import type { InteractionHandler, AutocompleteHandler, HandlerConstructor, Repliables } from '@interfaces/Handler';
import type { SlashHandler } from '@interfaces/SlashHandler';
import type { SlashOptionRegistry } from '@seedcord/types';
import type {
    ButtonInteraction,
    CacheType,
    ChannelSelectMenuInteraction,
    ContextMenuCommandInteraction,
    MentionableSelectMenuInteraction,
    ModalSubmitInteraction,
    RoleSelectMenuInteraction,
    StringSelectMenuInteraction,
    UserSelectMenuInteraction
} from 'discord.js';
import type { Constructor } from 'type-fest';

/**
 * Enum defining interaction route types for decorators
 *
 * @internal
 */
export enum InteractionRoutes {
    Slash = 'interaction:slash',
    Button = 'interaction:button',
    Modal = 'interaction:modal',
    StringMenu = 'interaction:stringMenu',
    UserMenu = 'interaction:userMenu',
    RoleMenu = 'interaction:roleMenu',
    ChannelMenu = 'interaction:channelMenu',
    MentionableMenu = 'interaction:mentionableMenu',
    MessageContextMenu = 'interaction:messageContextMenu',
    UserContextMenu = 'interaction:userContextMenu',
    Autocomplete = 'interaction:autocomplete'
}

/**
 * Types of select menus supported for routing
 */
export enum SelectMenuType {
    String = 'string',
    User = 'user',
    Role = 'role',
    Channel = 'channel',
    Mentionable = 'mentionable'
}

/**
 * Metadata key used to mark classes as interaction handlers
 *
 * @internal
 */
export const InteractionMetadataKey = Symbol('interaction:metadata');

/**
 * Extract the event type from an InteractionHandler subclass
 *
 * Used by the interaction routing decorators.
 *
 * @internal
 */
type HandlerEventType<TCtor extends new (...args: any[]) => InteractionHandler<Repliables>> =
    InstanceType<TCtor> extends InteractionHandler<infer TEvent> ? TEvent : never;

/**
 * Compile time assertion that the required event type(s) `TRequired` are included in the handler event union.
 *
 * Used by the interaction routing decorators.
 *
 * @internal
 */
type AssertHandles<TRequired, TCtor extends new (...args: any[]) => InteractionHandler<Repliables>> =
    Extract<HandlerEventType<TCtor>, TRequired> extends never
        ? Constructor<['Handler event generic must include', TRequired]>
        : TCtor;

/**
 * The slash route(s) a handler serves, read off its `SlashHandler` generic.
 *
 * @internal
 */
type SlashRouteOf<TCtor extends new (...args: any[]) => InteractionHandler<Repliables>> =
    InstanceType<TCtor> extends SlashHandler<infer Route, CacheType> ? Route : never;

/**
 * Compile-time assertion that the decorator's routes match the handler's `SlashHandler` generic exactly.
 * On a mismatch this resolves to a non-constructor type, so applying the decorator is a TS1238.
 *
 * @internal
 */
type AssertSlashRoute<Route extends string, TCtor extends new (...args: any[]) => InteractionHandler<Repliables>> = [
    Route
] extends [SlashRouteOf<TCtor>]
    ? [SlashRouteOf<TCtor>] extends [Route]
        ? TCtor
        : Constructor<['SlashHandler declares a route the SlashRoute decorator does not list', SlashRouteOf<TCtor>]>
    : Constructor<['SlashRoute does not match the SlashHandler generic', Route]>;

/**
 * Routes one or more slash commands to a {@link SlashHandler}.
 *
 * Pass the same route string(s) as the handler's generic. A single command reads `this.options`, several
 * commands branch with `this.match`. The decorator routes and the generic must match exactly, so listing
 * fewer or more than the handler declares is a compile error. Subcommands use a slash path.
 *
 * @param routes - The route string(s) this handler serves, e.g. `'ban'`, `'ban', 'kick'`, or `'demo/setup'`.
 * @decorator
 * @example
 * ```ts
 * \@SlashRoute('ban')
 * class BanHandler extends SlashHandler<'ban'> {
 *     async execute() {
 *         const target = this.options.getUser('target');
 *     }
 * }
 * ```
 *
 * @example
 * ```ts
 * \@SlashRoute('ban', 'kick')
 * class ModerationHandler extends SlashHandler<'ban' | 'kick'> {
 *     async execute() {
 *         await this.match({ ban: (o) => o.getUser('target'), kick: (o) => o.getUser('member') });
 *     }
 * }
 * ```
 */
export function SlashRoute<const Route extends keyof SlashOptionRegistry>(...routes: Route[]) {
    return function <TCtor extends new (...args: any[]) => InteractionHandler<Repliables>>(
        constructor: AssertSlashRoute<Route, TCtor>
    ): void {
        storeMetadata(InteractionRoutes.Slash, routes, constructor as HandlerConstructor);
    };
}

/**
 * Routes button interactions to handler classes.
 *
 * Pass the {@link CustomId} definition(s) this handler decodes and list the same ones in the handler's
 * generic. Passing different definitions to the decorator and the generic is a compile error. Routing
 * matches the stable prefix, so a wire minted from an older shape still reaches the handler, where
 * reading this.params throws StaleCustomId and the Catchable decorator turns it into a reply.
 *
 * @param defs - The customId definition(s) this handler decodes, one per route.
 * @decorator
 */
export function ButtonRoute<const Defs extends readonly AnyCustomId[]>(...defs: Defs) {
    return function <TCtor extends new (...args: any[]) => InteractionHandler<Repliables> & HasComponentDefs<Defs>>(
        constructor: AssertHandles<ButtonInteraction, TCtor>
    ): void {
        // justified: AssertHandles has already narrowed the ctor, this erases it to the metadata-store shape.
        storeComponentRoute(InteractionRoutes.Button, defs, constructor as HandlerConstructor);
    };
}

/**
 * Routes modal submissions to handler classes.
 *
 * Pass the {@link CustomId} definition(s) this handler decodes and list the same ones in the handler's
 * generic. Passing different definitions to the decorator and the generic is a compile error. Routing
 * matches the stable prefix, so an older-shape wire still reaches the handler and throws StaleCustomId
 * on read, the same as a button route.
 *
 * @param defs - The customId definition(s) this handler decodes, one per route.
 * @decorator
 */
export function ModalRoute<const Defs extends readonly AnyCustomId[]>(...defs: Defs) {
    return function <TCtor extends new (...args: any[]) => InteractionHandler<Repliables> & HasComponentDefs<Defs>>(
        constructor: AssertHandles<ModalSubmitInteraction, TCtor>
    ): void {
        // justified: AssertHandles has already narrowed the ctor, this erases it to the metadata-store shape.
        storeComponentRoute(InteractionRoutes.Modal, defs, constructor as HandlerConstructor);
    };
}

/**
 * Routes context menu commands to handler classes
 *
 * @param type - Context menu type: 'message' for message context menus, 'user' for user context menus
 * @param routeOrRoutes - Command name(s) to handle
 * @decorator
 */
export function ContextMenuRoute(type: 'message' | 'user', routeOrRoutes: string | string[]) {
    return function <TCtor extends new (...args: any[]) => InteractionHandler<Repliables>>(
        constructor: AssertHandles<ContextMenuCommandInteraction, TCtor>
    ): void {
        const routeType = type === 'message' ? InteractionRoutes.MessageContextMenu : InteractionRoutes.UserContextMenu;
        storeMetadata(routeType, routeOrRoutes, constructor as HandlerConstructor);
    };
}

/**
 * Routes autocomplete interactions to handler classes
 *
 * Handles autocomplete requests for specific command options.
 * Creates routes for each command-field combination.
 *
 * @param commandRoutes - Command path(s) to handle
 * @param focusedFields - Option name(s) to provide completions for
 * @example \@AutocompleteRoute('user', 'name') // Single command, single field
 * @example \@AutocompleteRoute(['user', 'profile'], ['name', 'bio']) // Multiple commands, multiple fields
 * @decorator
 */
export function AutocompleteRoute(commandRoutes: string | string[], focusedFields: string | string[]) {
    return function (constructor: Constructor<AutocompleteHandler>): void {
        const routes = Array.isArray(commandRoutes) ? commandRoutes : [commandRoutes];
        const fields = Array.isArray(focusedFields) ? focusedFields : [focusedFields];

        routes.forEach((route) => {
            fields.forEach((field) => {
                const autocompleteKey = `${route}:${field}`;
                storeMetadata(InteractionRoutes.Autocomplete, autocompleteKey, constructor);
            });
        });
    };
}

/**
 * Select menu interaction type mapping
 *
 * @internal
 */
export type SelectMenuInteractionFor<
    SelectMenu extends SelectMenuType,
    Cache extends CacheType = CacheType
> = SelectMenu extends SelectMenuType.String
    ? StringSelectMenuInteraction<Cache>
    : SelectMenu extends SelectMenuType.User
      ? UserSelectMenuInteraction<Cache>
      : SelectMenu extends SelectMenuType.Role
        ? RoleSelectMenuInteraction<Cache>
        : SelectMenu extends SelectMenuType.Channel
          ? ChannelSelectMenuInteraction<Cache>
          : SelectMenu extends SelectMenuType.Mentionable
            ? MentionableSelectMenuInteraction<Cache>
            : never;

/**
 * Routes select menu interactions to handler classes.
 *
 * Pass the select kind and the {@link CustomId} definition(s) this handler decodes. The handler's
 * generic must list the same definitions, and its second generic argument must be the matching select
 * interaction type, or it is a compile error.
 *
 * @param type - Select menu kind from {@link SelectMenuType}.
 * @param defs - The customId definition(s) this handler decodes, one per route.
 * @decorator
 *
 * @example
 * ```typescript
 * \@SelectMenuRoute(SelectMenuType.User, AssignId)
 * class AssignSelect extends SelectHandler<SelectMenuType.User, [typeof AssignId]> {
 *   // handles user select menus minted from AssignId
 * }
 * ```
 */
export function SelectMenuRoute<SelectMenu extends SelectMenuType, const Defs extends readonly AnyCustomId[]>(
    type: SelectMenu,
    ...defs: Defs
) {
    return function <TCtor extends new (...args: any[]) => InteractionHandler<Repliables> & HasComponentDefs<Defs>>(
        constructor: AssertHandles<SelectMenuInteractionFor<SelectMenu>, TCtor>
    ): void {
        const routeMap = {
            [SelectMenuType.String]: InteractionRoutes.StringMenu,
            [SelectMenuType.User]: InteractionRoutes.UserMenu,
            [SelectMenuType.Role]: InteractionRoutes.RoleMenu,
            [SelectMenuType.Channel]: InteractionRoutes.ChannelMenu,
            [SelectMenuType.Mentionable]: InteractionRoutes.MentionableMenu
        };

        // justified: AssertHandles has already narrowed the ctor, this erases it to the metadata-store shape.
        storeComponentRoute(routeMap[type], defs, constructor as HandlerConstructor);
    };
}

// store each definition's stable prefix as a routing key for the controller, and the full defs array on
// the constructor so the handler base can decode against them.
function storeComponentRoute(
    symbol: InteractionRoutes,
    defs: readonly AnyCustomId[],
    constructor: HandlerConstructor
): void {
    storeMetadata(
        symbol,
        defs.map((def) => def.prefix),
        constructor
    );
    Reflect.defineMetadata(ComponentDefsKey, defs, constructor);
}

/**
 * Helper to store route(s) in an array on reflect metadata.
 */
function storeMetadata(
    symbol: InteractionRoutes,
    routes: string | string[],
    constructor: Constructor<InteractionHandler<Repliables> | AutocompleteHandler>
): void {
    const savedRoutes: unknown = Reflect.getMetadata(symbol, constructor);
    const existing: string[] = areRoutes(savedRoutes) ? savedRoutes : [];

    const toStore = Array.isArray(routes) ? routes : [routes];
    Reflect.defineMetadata(symbol, [...existing, ...toStore], constructor);
    Reflect.defineMetadata(InteractionMetadataKey, true, constructor);
}
