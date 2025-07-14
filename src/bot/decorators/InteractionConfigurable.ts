import { ConstructorFunction } from '../../core/library/types/Miscellaneous';

export enum InteractionRoutes {
  Slash = 'interaction:slash',
  Button = 'interaction:button',
  Modal = 'interaction:modal',
  StringMenu = 'interaction:stringMenu'
}

/**
 * Decorator for slash command routes. The route can be:
 *  - "profile"
 *  - "settings/edit"
 *  - "settings/advanced/edit"
 *
 * Pass an array of routes if the same handler should respond to multiple.
 */
export function SlashRoute(routeOrRoutes: string | string[]) {
  return function (constructor: ConstructorFunction) {
    storeMetadata(InteractionRoutes.Slash, routeOrRoutes, constructor);
  };
}

/**
 * Decorator for button routes. This should match a `customId` prefix.
 * e.g., 'accept' or 'login'.
 */
export function ButtonRoute(routeOrRoutes: string | string[]) {
  return function (constructor: ConstructorFunction) {
    storeMetadata(InteractionRoutes.Button, routeOrRoutes, constructor);
  };
}

/**
 * Decorator for modal routes. This should match a `customId` prefix.
 */
export function ModalRoute(routeOrRoutes: string | string[]) {
  return function (constructor: ConstructorFunction) {
    storeMetadata(InteractionRoutes.Modal, routeOrRoutes, constructor);
  };
}

/**
 * Decorator for string select menu routes. This should match a `customId` prefix.
 */
export function StringSelectMenuRoute(routeOrRoutes: string | string[]) {
  return function (constructor: ConstructorFunction) {
    storeMetadata(InteractionRoutes.StringMenu, routeOrRoutes, constructor);
  };
}

/**
 * Helper to store route(s) in an array on reflect metadata.
 */
function storeMetadata(symbol: InteractionRoutes, routes: string | string[], constructor: ConstructorFunction) {
  const existing: string[] = (Reflect.getMetadata(symbol, constructor) as string[]) || [];
  const toStore = Array.isArray(routes) ? routes : [routes];
  Reflect.defineMetadata(symbol, [...existing, ...toStore], constructor);
}
