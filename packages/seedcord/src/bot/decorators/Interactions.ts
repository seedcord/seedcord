import { areRoutes } from '@miscellaneous/areRoutes';

import type { InteractionHandler, AutocompleteHandler, HandlerConstructor, Repliables } from '@interfaces/Handler';
import type {
    ButtonInteraction,
    ChannelSelectMenuInteraction,
    ChatInputCommandInteraction,
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
export type HandlerEventType<TCtor extends new (...args: any[]) => InteractionHandler<Repliables>> =
    InstanceType<TCtor> extends InteractionHandler<infer TEvent> ? TEvent : never;

/**
 * Compile time assertion that the required event type(s) `TRequired` are included in the handler event union.
 *
 * Used by the interaction routing decorators.
 *
 * @internal
 */
export type AssertHandles<TRequired, TCtor extends new (...args: any[]) => InteractionHandler<Repliables>> =
    Extract<HandlerEventType<TCtor>, TRequired> extends never
        ? Constructor<['Handler event generic must include', TRequired]>
        : TCtor;

/**
 * Routes slash commands to handler classes
 *
 * Supports single commands, subcommands, and subcommand groups.
 * Use forward slashes to separate subcommand paths.
 *
 * @param routeOrRoutes - Command path(s) to handle
 * @decorator
 * @example
 * ```typescript
 * \@SlashRoute('ping')
 * class PingCommand extends InteractionHandler {
 *   // handles /ping command
 * }
 * ```
 *
 * @example
 * ```
 * \@SlashRoute(['ban', 'kick'])
 * class ModerationHandler extends InteractionHandler {
 *   // handles /ban and /kick commands
 * }
 * ```
 *
 * @example
 * ```
 * \@SlashRoute('admin/user/promote')
 * class PromoteHandler extends InteractionHandler {
 *   // handles /admin user promote subcommand
 * }
 * ```
 */
export function SlashRoute(routeOrRoutes: string | string[]) {
    return function <TCtor extends new (...args: any[]) => InteractionHandler<Repliables>>(
        constructor: AssertHandles<ChatInputCommandInteraction, TCtor>
    ): void {
        storeMetadata(InteractionRoutes.Slash, routeOrRoutes, constructor as HandlerConstructor);
    };
}

/**
 * Routes button interactions to handler classes
 *
 * Matches the customId prefix before the first colon.
 *
 * For customId `accept:user123`, use `@ButtonRoute("accept")`.
 *
 * @param routeOrRoutes - CustomId prefix(es) to handle
 * @decorator
 */
export function ButtonRoute(routeOrRoutes: string | string[]) {
    return function <TCtor extends new (...args: any[]) => InteractionHandler<Repliables>>(
        constructor: AssertHandles<ButtonInteraction, TCtor>
    ): void {
        storeMetadata(InteractionRoutes.Button, routeOrRoutes, constructor as HandlerConstructor);
    };
}

/**
 * Routes modal submissions to handler classes
 *
 * Matches the customId prefix before the first colon.
 *
 * @param routeOrRoutes - CustomId prefix(es) to handle
 * @decorator
 */
export function ModalRoute(routeOrRoutes: string | string[]) {
    return function <TCtor extends new (...args: any[]) => InteractionHandler<Repliables>>(
        constructor: AssertHandles<ModalSubmitInteraction, TCtor>
    ): void {
        storeMetadata(InteractionRoutes.Modal, routeOrRoutes, constructor as HandlerConstructor);
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

        // Create unique keys for each route-focused combination
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
export type SelectMenuInteractionFor<SelectMenu extends SelectMenuType> = SelectMenu extends SelectMenuType.String
    ? StringSelectMenuInteraction
    : SelectMenu extends SelectMenuType.User
      ? UserSelectMenuInteraction
      : SelectMenu extends SelectMenuType.Role
        ? RoleSelectMenuInteraction
        : SelectMenu extends SelectMenuType.Channel
          ? ChannelSelectMenuInteraction
          : SelectMenu extends SelectMenuType.Mentionable
            ? MentionableSelectMenuInteraction
            : never;

/**
 * Routes select menu interactions to handler classes
 *
 * Matches the customId prefix before the first colon.
 *
 * @param type - Select menu type from {@link SelectMenuType}
 * @param routeOrRoutes - CustomId prefix(es) to handle
 *
 * @decorator
 *
 * @example
 * ```typescript
 * \@SelectMenuRoute(SelectMenuType.String, 'fruits')
 * class RoleSelectHandler extends InteractionHandler {
 *   // handles string select menus with customId starting with 'fruits'
 * }
 * ```
 */
export function SelectMenuRoute<SelectMenu extends SelectMenuType>(type: SelectMenu, routeOrRoutes: string | string[]) {
    return function <TCtor extends new (...args: any[]) => InteractionHandler<Repliables>>(
        constructor: AssertHandles<SelectMenuInteractionFor<SelectMenu>, TCtor>
    ): void {
        const routeMap = {
            [SelectMenuType.String]: InteractionRoutes.StringMenu,
            [SelectMenuType.User]: InteractionRoutes.UserMenu,
            [SelectMenuType.Role]: InteractionRoutes.RoleMenu,
            [SelectMenuType.Channel]: InteractionRoutes.ChannelMenu,
            [SelectMenuType.Mentionable]: InteractionRoutes.MentionableMenu
        };

        storeMetadata(routeMap[type], routeOrRoutes, constructor as HandlerConstructor);
    };
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
