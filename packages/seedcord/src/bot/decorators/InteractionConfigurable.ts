import type { ConstructorFunction } from '@seedcord/types';

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

export enum SelectMenuType {
  String = 'string',
  User = 'user',
  Role = 'role',
  Channel = 'channel',
  Mentionable = 'mentionable'
}

export const InteractionMetadataKey = Symbol('interaction:metadata');

/**
 * Decorator for slash command routes. The route can be:
 *  - "profile"
 *  - "settings/edit"
 *  - "settings/advanced/edit"
 *
 * Pass an array of routes if the same handler should respond to multiple.
 */
export function SlashRoute(routeOrRoutes: string | string[]) {
  return function (constructor: ConstructorFunction): void {
    storeMetadata(InteractionRoutes.Slash, routeOrRoutes, constructor);
  };
}

/**
 * Decorator for button routes. This should match a `customId` prefix.
 * e.g., 'accept' or 'login'.
 */
export function ButtonRoute(routeOrRoutes: string | string[]) {
  return function (constructor: ConstructorFunction): void {
    storeMetadata(InteractionRoutes.Button, routeOrRoutes, constructor);
  };
}

/**
 * Decorator for modal routes. This should match a `customId` prefix.
 */
export function ModalRoute(routeOrRoutes: string | string[]) {
  return function (constructor: ConstructorFunction): void {
    storeMetadata(InteractionRoutes.Modal, routeOrRoutes, constructor);
  };
}

/**
 * Decorator for context menu commands. This should match the command name.
 * @param type - The type of context menu ('message' or 'user')
 * @param routeOrRoutes - The command name(s) to route to this handler
 */
export function ContextMenuRoute(type: 'message' | 'user', routeOrRoutes: string | string[]) {
  return function (constructor: ConstructorFunction): void {
    const routeType = type === 'message' ? InteractionRoutes.MessageContextMenu : InteractionRoutes.UserContextMenu;
    storeMetadata(routeType, routeOrRoutes, constructor);
  };
}

/**
 * Decorator for autocomplete interactions. Supports routing by command and focused field.
 * @param commandRoutes - Command name or subcommand paths
 * @param focusedFields - Focused option names to handle
 * @example @AutocompleteRoute('user', 'name') // Single command, single field
 * @example @AutocompleteRoute(['user', 'profile'], ['name', 'bio']) // Multiple commands, multiple fields
 */
export function AutocompleteRoute(commandRoutes: string | string[], focusedFields: string | string[]) {
  return function (constructor: ConstructorFunction): void {
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
 * Decorator for select menu routes. This should match a `customId` prefix.
 */
export function SelectMenuRoute(type: SelectMenuType, routeOrRoutes: string | string[]) {
  return function (constructor: ConstructorFunction): void {
    const routeMap = {
      [SelectMenuType.String]: InteractionRoutes.StringMenu,
      [SelectMenuType.User]: InteractionRoutes.UserMenu,
      [SelectMenuType.Role]: InteractionRoutes.RoleMenu,
      [SelectMenuType.Channel]: InteractionRoutes.ChannelMenu,
      [SelectMenuType.Mentionable]: InteractionRoutes.MentionableMenu
    };

    storeMetadata(routeMap[type], routeOrRoutes, constructor);
  };
}

/**
 * Helper to store route(s) in an array on reflect metadata.
 */
function storeMetadata(symbol: InteractionRoutes, routes: string | string[], constructor: ConstructorFunction): void {
  const areRoutes = (routes: unknown): routes is string[] => {
    return Array.isArray(routes) && routes.every((r) => typeof r === 'string');
  };

  const savedRoutes: unknown = Reflect.getMetadata(symbol, constructor);
  const existing: string[] = areRoutes(savedRoutes) ? savedRoutes : [];

  const toStore = Array.isArray(routes) ? routes : [routes];
  Reflect.defineMetadata(symbol, [...existing, ...toStore], constructor);
  Reflect.defineMetadata(InteractionMetadataKey, true, constructor);
}
