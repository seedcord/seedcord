import {
    InteractionRoutes,
    contextMenuRouteOf,
    selectMenuRouteOf,
    storeComponentRoute,
    storeInteractionRoute
} from '@seedcord/core/internal';

import type { BaseHandler, Repliables } from '@handlers/BaseHandler';
import type { AutocompleteHandler } from '@handlers/interaction/AutocompleteHandler';
import type { ContextMenuHandler } from '@handlers/interaction/ContextMenuHandler';
import type { InteractionHandler } from '@handlers/interaction/InteractionHandler';
import type { SlashHandler } from '@handlers/interaction/SlashHandler';
import type {
    SelectMenuKind,
    MessageContextMenuRegistry,
    SlashOptionRegistry,
    UserContextMenuRegistry
} from '@seedcord/core';
import type { HasComponentDefs, AnyCustomId } from '@seedcord/core/internal';
import type {
    ApplicationCommandType,
    AutocompleteInteraction,
    ButtonInteraction,
    CacheType,
    ChannelSelectMenuInteraction,
    MentionableSelectMenuInteraction,
    ModalSubmitInteraction,
    RoleSelectMenuInteraction,
    StringSelectMenuInteraction,
    UserSelectMenuInteraction
} from 'discord.js';
import type { Constructor } from 'type-fest';

/** @internal */
type HandlerEventType<TCtor extends new (...args: any[]) => InteractionHandler<Repliables>> =
    InstanceType<TCtor> extends InteractionHandler<infer TEvent> ? TEvent : never;

/**
 * Compile-time assertion that the required event type(s) `TRequired` are included in the handler event union.
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
 * On a route/generic mismatch, resolves to a non-constructor type so applying the decorator is a TS1238.
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
        storeInteractionRoute(InteractionRoutes.Slash, routes, constructor);
    };
}

/**
 * Routes button interactions to handler classes.
 *
 * Pass the {@link CustomId} definition(s) this handler decodes and list the same ones in the handler's
 * generic. Passing different definitions to the decorator and the generic is a compile error. Routing
 * matches the stable prefix, so a wire minted from an older shape still reaches the handler, where
 * reading this.params throws StaleCustomId and the controller boundary turns it into a reply.
 *
 * @param defs - The customId definition(s) this handler decodes, one per route.
 * @decorator
 */
export function ButtonRoute<const Defs extends readonly AnyCustomId[]>(...defs: Defs) {
    return function <TCtor extends new (...args: any[]) => InteractionHandler<Repliables> & HasComponentDefs<Defs>>(
        constructor: AssertHandles<ButtonInteraction, TCtor>
    ): void {
        storeComponentRoute(InteractionRoutes.Button, defs, constructor);
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
        storeComponentRoute(InteractionRoutes.Modal, defs, constructor);
    };
}

/** The context-menu command names valid for a kind, read off the matching registry. @internal */
type NamesFor<Kind extends ApplicationCommandType.User | ApplicationCommandType.Message> =
    Kind extends ApplicationCommandType.User ? keyof UserContextMenuRegistry : keyof MessageContextMenuRegistry;

/**
 * The context-menu kind a handler serves, read off its event's `commandType` discriminant. Direct
 * inference from the `ContextMenuHandler` generic widens the kind to the whole union because the handler's
 * conditional members blur it, so this uses the event literal to keep it narrow.
 *
 * @internal
 */
type ContextMenuKindOf<TCtor extends new (...args: any[]) => InteractionHandler<Repliables>> =
    InstanceType<TCtor> extends ContextMenuHandler<infer Kind, CacheType>
        ? [Kind] extends [ApplicationCommandType.User | ApplicationCommandType.Message]
            ? HandlerEventType<TCtor> extends { commandType: infer K }
                ? Extract<K, ApplicationCommandType.User | ApplicationCommandType.Message>
                : never
            : never
        : never;

/**
 * On a kind mismatch between the decorator and the handler generic, resolves to a non-constructor type so
 * applying the decorator is a TS1238. Cross-checks both directions, mirroring {@link AssertSlashRoute}.
 *
 * @internal
 */
type AssertContextMenuRoute<
    Kind extends ApplicationCommandType.User | ApplicationCommandType.Message,
    TCtor extends new (...args: any[]) => InteractionHandler<Repliables>
> = [Kind] extends [ContextMenuKindOf<TCtor>]
    ? [ContextMenuKindOf<TCtor>] extends [Kind]
        ? TCtor
        : Constructor<
              [
                  'ContextMenuHandler declares a kind the ContextMenuRoute decorator does not match',
                  ContextMenuKindOf<TCtor>
              ]
          >
    : Constructor<['ContextMenuRoute does not match the ContextMenuHandler generic', Kind]>;

/**
 * Routes one or more context-menu commands to a {@link ContextMenuHandler}.
 *
 * Pass the kind (`ApplicationCommandType.User` or `ApplicationCommandType.Message`) and the command name(s),
 * each checked against that kind's registry, so a typo is a compile error. The same kind must sit on the
 * handler's generic, cross-checked both directions. Context menus carry no options, so a multi-name handler
 * reads `this.target` uniformly with no branch.
 *
 * @param kind - The context-menu kind, `ApplicationCommandType.User` or `ApplicationCommandType.Message`.
 * @param names - The command name(s) this handler serves, keyed off the matching registry.
 * @decorator
 * @example
 * ```ts
 * \@ContextMenuRoute(ApplicationCommandType.User, 'View Profile')
 * class ViewProfile extends ContextMenuHandler<ApplicationCommandType.User> {
 *     async execute() {
 *         const user = this.target;
 *     }
 * }
 * ```
 */
export function ContextMenuRoute<const Kind extends ApplicationCommandType.User | ApplicationCommandType.Message>(
    kind: Kind,
    ...names: NamesFor<Kind>[]
) {
    return function <TCtor extends new (...args: any[]) => InteractionHandler<Repliables>>(
        constructor: AssertContextMenuRoute<Kind, TCtor>
    ): void {
        storeInteractionRoute(contextMenuRouteOf(kind), names, constructor);
    };
}

/**
 * The command route(s) an autocomplete handler serves, read off its `AutocompleteHandler` generic.
 *
 * @internal
 */
type AutocompleteRouteOf<TCtor extends new (...args: any[]) => BaseHandler<AutocompleteInteraction<CacheType>>> =
    InstanceType<TCtor> extends AutocompleteHandler<infer Route, CacheType> ? Route : never;

/**
 * On a route/generic mismatch, resolves to a non-constructor type so applying the decorator is a TS1238.
 *
 * @internal
 */
type AssertAutocompleteRoute<
    Route extends keyof SlashOptionRegistry,
    TCtor extends new (...args: any[]) => BaseHandler<AutocompleteInteraction<CacheType>>
> = [Route] extends [AutocompleteRouteOf<TCtor>]
    ? [AutocompleteRouteOf<TCtor>] extends [Route]
        ? TCtor
        : Constructor<
              [
                  'AutocompleteHandler declares a command the AutocompleteRoute decorator does not list',
                  AutocompleteRouteOf<TCtor>
              ]
          >
    : Constructor<['AutocompleteRoute does not match the AutocompleteHandler generic', Route]>;

/**
 * Routes one or more commands' autocomplete to an {@link AutocompleteHandler}.
 *
 * Pass the same command route string(s) as the handler's generic. One command branches with `this.match`
 * over its autocompletable fields, several commands share one handler whose arms span every command's
 * fields. The decorator routes and the generic must match exactly, so listing fewer or more than the
 * handler declares is a compile error.
 *
 * @param routes - The command route string(s) this handler serves, e.g. `'search'` or `'search', 'find'`.
 * @decorator
 * @example
 * ```ts
 * \@AutocompleteRoute('search')
 * class SearchAutocomplete extends AutocompleteHandler<'search'> {
 *     async execute() {
 *         await this.match({ query: (value, respond) => respond([{ name: value, value }]) });
 *     }
 * }
 * ```
 */
export function AutocompleteRoute<const Route extends keyof SlashOptionRegistry>(...routes: Route[]) {
    return function <TCtor extends new (...args: any[]) => BaseHandler<AutocompleteInteraction<CacheType>>>(
        constructor: AssertAutocompleteRoute<Route, TCtor>
    ): void {
        storeInteractionRoute(InteractionRoutes.Autocomplete, routes, constructor);
    };
}

/** @internal */
export type SelectMenuInteractionFor<
    SelectMenu extends SelectMenuKind,
    Cache extends CacheType = CacheType
> = SelectMenu extends SelectMenuKind.String
    ? StringSelectMenuInteraction<Cache>
    : SelectMenu extends SelectMenuKind.User
      ? UserSelectMenuInteraction<Cache>
      : SelectMenu extends SelectMenuKind.Role
        ? RoleSelectMenuInteraction<Cache>
        : SelectMenu extends SelectMenuKind.Channel
          ? ChannelSelectMenuInteraction<Cache>
          : SelectMenu extends SelectMenuKind.Mentionable
            ? MentionableSelectMenuInteraction<Cache>
            : never;

/**
 * Routes select menu interactions to handler classes.
 *
 * Pass the select kind and the {@link CustomId} definition(s) this handler decodes. The handler's
 * generic must list the same definitions, and its second generic argument must be the matching select
 * interaction type, or it is a compile error.
 *
 * @param type - Select menu kind from {@link SelectMenuKind}.
 * @param defs - The customId definition(s) this handler decodes, one per route.
 * @decorator
 *
 * @example
 * ```typescript
 * \@SelectMenuRoute(SelectMenuKind.User, AssignId)
 * class AssignSelect extends SelectMenuHandler<SelectMenuKind.User, [typeof AssignId]> {
 *   // handles user select menus minted from AssignId
 * }
 * ```
 */
export function SelectMenuRoute<SelectMenu extends SelectMenuKind, const Defs extends readonly AnyCustomId[]>(
    type: SelectMenu,
    ...defs: Defs
) {
    return function <TCtor extends new (...args: any[]) => InteractionHandler<Repliables> & HasComponentDefs<Defs>>(
        constructor: AssertHandles<SelectMenuInteractionFor<SelectMenu>, TCtor>
    ): void {
        storeComponentRoute(selectMenuRouteOf(type), defs, constructor);
    };
}
