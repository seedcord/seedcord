/* eslint-disable max-lines -- this one file has all the route defs */

import { ApplicationCommandType } from 'discord-api-types/v10';

import { contextMenuRouteOf, storeComponentRoute, storeInteractionRoute } from '#decorators/interactionRoutes';
import { InteractionKind } from '#src/metadataKeys';

import type { ContextMenuKind, NamesFor } from '#registries/ContextMenuRegistry';
import type { SlashRegistry } from '#registries/SlashRegistry';
import type {
    AutocompleteRouteBrand,
    ComponentDefsBrand,
    ComponentKindBrand,
    ContextMenuKindBrand,
    ContextMenuNamesBrand,
    SlashRouteBrand
} from './brands';
import type { AnyCustomId } from '@seedcord/custom-id';
import type { TypedExtract } from '@seedcord/types';
import type { Constructor } from 'type-fest';

// Extract over Exclude so a kind added to the enum stays out until someone gives it a decorator
type ComponentBrand = TypedExtract<
    InteractionKind,
    | InteractionKind.Button
    | InteractionKind.Modal
    | InteractionKind.StringMenu
    | InteractionKind.UserMenu
    | InteractionKind.RoleMenu
    | InteractionKind.ChannelMenu
    | InteractionKind.MentionableMenu
>;

// phantom brands keep the decorators off transport-specific classes
type AnyHandlerCtor = new (...args: any[]) => unknown;

type SlashRouteOf<TCtor extends AnyHandlerCtor> =
    InstanceType<TCtor> extends {
        [SlashRouteBrand]?: infer Route extends keyof SlashRegistry;
    }
        ? Route
        : never;

type AutocompleteRouteOf<TCtor extends AnyHandlerCtor> =
    InstanceType<TCtor> extends {
        [AutocompleteRouteBrand]?: infer Route extends keyof SlashRegistry;
    }
        ? Route
        : never;

type ContextMenuKindOf<TCtor extends AnyHandlerCtor> =
    InstanceType<TCtor> extends {
        [ContextMenuKindBrand]?: infer Kind extends ContextMenuKind;
    }
        ? Kind
        : never;

type ContextMenuNamesOf<TCtor extends AnyHandlerCtor> =
    InstanceType<TCtor> extends {
        [ContextMenuNamesBrand]?: infer Names;
    }
        ? Names
        : never;

type ComponentOf<TCtor extends AnyHandlerCtor> =
    InstanceType<TCtor> extends {
        [ComponentKindBrand]?: infer Brand extends ComponentBrand;
    }
        ? Brand
        : never;

type DefsOf<TCtor extends AnyHandlerCtor> =
    InstanceType<TCtor> extends {
        [ComponentDefsBrand]?: infer Defs extends readonly AnyCustomId[];
    }
        ? Defs
        : never;

type AssertSlashRoute<Route extends keyof SlashRegistry, TCtor extends AnyHandlerCtor> = [Route] extends [
    SlashRouteOf<TCtor>
]
    ? [SlashRouteOf<TCtor>] extends [Route]
        ? TCtor
        : Constructor<['SlashHandler declares a route the SlashRoute decorator does not list', SlashRouteOf<TCtor>]>
    : Constructor<['SlashRoute does not match the SlashHandler generic', Route]>;

type AssertAutocompleteRoute<Route extends keyof SlashRegistry, TCtor extends AnyHandlerCtor> = [Route] extends [
    AutocompleteRouteOf<TCtor>
]
    ? [AutocompleteRouteOf<TCtor>] extends [Route]
        ? TCtor
        : Constructor<
              [
                  'AutocompleteHandler declares a command the AutocompleteRoute decorator does not list',
                  AutocompleteRouteOf<TCtor>
              ]
          >
    : Constructor<['AutocompleteRoute does not match the AutocompleteHandler generic', Route]>;

type AssertContextMenuRoute<
    Kind extends ContextMenuKind,
    Names extends NamesFor<Kind>,
    TCtor extends AnyHandlerCtor
> = [Kind] extends [ContextMenuKindOf<TCtor>]
    ? [ContextMenuKindOf<TCtor>] extends [Kind]
        ? [Names] extends [ContextMenuNamesOf<TCtor>]
            ? [ContextMenuNamesOf<TCtor>] extends [Names]
                ? TCtor
                : Constructor<
                      [
                          'ContextMenuHandler declares a name the ContextMenuRoute decorator does not list',
                          ContextMenuNamesOf<TCtor>
                      ]
                  >
            : Constructor<['ContextMenuRoute lists a name the ContextMenuHandler generic does not declare', Names]>
        : Constructor<
              [
                  'ContextMenuHandler declares a kind the ContextMenuRoute decorator does not match',
                  ContextMenuKindOf<TCtor>
              ]
          >
    : Constructor<['ContextMenuRoute does not match the ContextMenuHandler generic', Kind]>;

// only one assignability direction, since a bidirectional check would reject const-inferred readonly tuples
type AssertComponentRoute<
    Brand extends ComponentBrand,
    Defs extends readonly AnyCustomId[],
    TCtor extends AnyHandlerCtor
> = [ComponentOf<TCtor>] extends [Brand]
    ? [Brand] extends [ComponentOf<TCtor>]
        ? [DefsOf<TCtor>] extends [Defs]
            ? TCtor
            : Constructor<['the customId definitions do not match the handler generic', DefsOf<TCtor>]>
        : Constructor<['the decorator does not match the handler kind', ComponentOf<TCtor>]>
    : Constructor<['the decorator does not match the handler kind', ComponentOf<TCtor>]>;

/**
 * Routes one or more slash commands to a `SlashHandler`.
 *
 * Pass the same route string(s) as the handler's generic. A single command reads `this.options`, several
 * commands branch with `this.match`. The decorator routes and the generic must match exactly. Listing
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
 */
export function SlashRoute<const Route extends keyof SlashRegistry>(...routes: Route[]) {
    return function <TCtor extends AnyHandlerCtor>(constructor: AssertSlashRoute<Route, TCtor>): void {
        storeInteractionRoute(InteractionKind.Slash, routes, constructor);
    };
}

/**
 * Routes one or more commands' autocomplete to an `AutocompleteHandler`.
 *
 * Pass the same command route string(s) as the handler's generic. One command branches with `this.match`
 * over its autocompletable fields, several commands share one handler whose arms span every command's
 * fields. Listing fewer or more commands than the handler declares is a compile error, since the
 * decorator routes and the generic must match exactly.
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
export function AutocompleteRoute<const Route extends keyof SlashRegistry>(...routes: Route[]) {
    return function <TCtor extends AnyHandlerCtor>(constructor: AssertAutocompleteRoute<Route, TCtor>): void {
        storeInteractionRoute(InteractionKind.Autocomplete, routes, constructor);
    };
}

/**
 * Routes one or more user context-menu commands to a `UserContextMenuHandler`.
 *
 * Every name is checked against the user registry. The handler's generic must declare the same names,
 * checked in both directions.
 *
 * @param names - The command name(s) this handler serves.
 * @decorator
 * @example
 * ```ts
 * \@UserContextMenuRoute('View Profile')
 * class ViewProfile extends UserContextMenuHandler<'View Profile'> {
 *     async execute() {
 *         const user = this.target;
 *     }
 * }
 * ```
 */
export function UserContextMenuRoute<const Names extends NamesFor<ApplicationCommandType.User>>(...names: Names[]) {
    return function <TCtor extends AnyHandlerCtor>(
        constructor: AssertContextMenuRoute<ApplicationCommandType.User, Names, TCtor>
    ): void {
        storeInteractionRoute(contextMenuRouteOf(ApplicationCommandType.User), names, constructor);
    };
}

/**
 * Routes one or more message context-menu commands to a `MessageContextMenuHandler`.
 *
 * Every name is checked against the message registry. The handler's generic must declare the same names,
 * checked in both directions.
 *
 * @param names - The command name(s) this handler serves.
 * @decorator
 * @example
 * ```ts
 * \@MessageContextMenuRoute('Report Message')
 * class ReportMessage extends MessageContextMenuHandler<'Report Message'> {
 *     async execute() {
 *         const message = this.target;
 *     }
 * }
 * ```
 */
export function MessageContextMenuRoute<const Names extends NamesFor<ApplicationCommandType.Message>>(
    ...names: Names[]
) {
    return function <TCtor extends AnyHandlerCtor>(
        constructor: AssertContextMenuRoute<ApplicationCommandType.Message, Names, TCtor>
    ): void {
        storeInteractionRoute(contextMenuRouteOf(ApplicationCommandType.Message), names, constructor);
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
    return function <TCtor extends AnyHandlerCtor>(
        constructor: AssertComponentRoute<InteractionKind.Button, Defs, TCtor>
    ): void {
        storeComponentRoute(InteractionKind.Button, defs, constructor);
    };
}

/**
 * Routes modal submissions to handler classes.
 *
 * Pass the {@link CustomId} definition(s) this handler decodes and list the same ones in the handler's
 * generic. Passing different definitions to the decorator and the generic is a compile error. Routing
 * matches the stable prefix here too, throwing StaleCustomId on read the same as a button route.
 *
 * @param defs - The customId definition(s) this handler decodes, one per route.
 * @decorator
 */
export function ModalRoute<const Defs extends readonly AnyCustomId[]>(...defs: Defs) {
    return function <TCtor extends AnyHandlerCtor>(
        constructor: AssertComponentRoute<InteractionKind.Modal, Defs, TCtor>
    ): void {
        storeComponentRoute(InteractionKind.Modal, defs, constructor);
    };
}

/**
 * Routes string select menu interactions to a `StringMenuHandler`.
 *
 * Pass the {@link CustomId} definition(s) this handler decodes and list the same ones in the handler's
 * generic. The handler reads the chosen option values from `this.values`.
 *
 * @param defs - The customId definition(s) this handler decodes, one per route.
 * @decorator
 * @example
 * ```ts
 * \@StringMenuRoute(TopicsId)
 * class Topics extends StringMenuHandler<[typeof TopicsId]> {
 *     async execute() {
 *         await this.update(`following ${this.values.join(', ')}`);
 *     }
 * }
 * ```
 */
export function StringMenuRoute<const Defs extends readonly AnyCustomId[]>(...defs: Defs) {
    return function <TCtor extends AnyHandlerCtor>(
        constructor: AssertComponentRoute<InteractionKind.StringMenu, Defs, TCtor>
    ): void {
        storeComponentRoute(InteractionKind.StringMenu, defs, constructor);
    };
}

/**
 * Routes user select menu interactions to a `UserMenuHandler`.
 *
 * Pass the {@link CustomId} definition(s) this handler decodes and list the same ones in the handler's
 * generic. Beside `this.values` the handler declares `this.users` and `this.members`. Discord resolves
 * the members only inside a guild.
 *
 * @param defs - The customId definition(s) this handler decodes, one per route.
 * @decorator
 * @example
 * ```ts
 * \@UserMenuRoute(AssignId)
 * class Assign extends UserMenuHandler<[typeof AssignId]> {
 *     async execute() {
 *         const { roleId } = this.params;
 *         await this.reply(`assigning ${this.users.size} member(s) to <@&${roleId}>`);
 *     }
 * }
 * ```
 */
export function UserMenuRoute<const Defs extends readonly AnyCustomId[]>(...defs: Defs) {
    return function <TCtor extends AnyHandlerCtor>(
        constructor: AssertComponentRoute<InteractionKind.UserMenu, Defs, TCtor>
    ): void {
        storeComponentRoute(InteractionKind.UserMenu, defs, constructor);
    };
}

/**
 * Routes role select menu interactions to a `RoleMenuHandler`.
 *
 * Pass the {@link CustomId} definition(s) this handler decodes and list the same ones in the handler's
 * generic. Beside `this.values` the handler declares `this.roles`.
 *
 * @param defs - The customId definition(s) this handler decodes, one per route.
 * @decorator
 * @example
 * ```ts
 * \@RoleMenuRoute(GrantId)
 * class Grant extends RoleMenuHandler<[typeof GrantId]> {
 *     async execute() {
 *         await this.update(`granting ${this.roles.size} role(s)`);
 *     }
 * }
 * ```
 */
export function RoleMenuRoute<const Defs extends readonly AnyCustomId[]>(...defs: Defs) {
    return function <TCtor extends AnyHandlerCtor>(
        constructor: AssertComponentRoute<InteractionKind.RoleMenu, Defs, TCtor>
    ): void {
        storeComponentRoute(InteractionKind.RoleMenu, defs, constructor);
    };
}

/**
 * Routes channel select menu interactions to a `ChannelMenuHandler`.
 *
 * Pass the {@link CustomId} definition(s) this handler decodes and list the same ones in the handler's
 * generic. Beside `this.values` the handler declares `this.channels`.
 *
 * @param defs - The customId definition(s) this handler decodes, one per route.
 * @decorator
 * @example
 * ```ts
 * \@ChannelMenuRoute(LogTargetId)
 * class LogTarget extends ChannelMenuHandler<[typeof LogTargetId]> {
 *     async execute() {
 *         await this.update(`logging to ${this.channels.size} channel(s)`);
 *     }
 * }
 * ```
 */
export function ChannelMenuRoute<const Defs extends readonly AnyCustomId[]>(...defs: Defs) {
    return function <TCtor extends AnyHandlerCtor>(
        constructor: AssertComponentRoute<InteractionKind.ChannelMenu, Defs, TCtor>
    ): void {
        storeComponentRoute(InteractionKind.ChannelMenu, defs, constructor);
    };
}

/**
 * Routes mentionable select menu interactions to a `MentionableMenuHandler`.
 *
 * Pass the {@link CustomId} definition(s) this handler decodes and list the same ones in the handler's
 * generic. A mentionable menu accepts users and roles together. `this.users`, `this.members`, and
 * `this.roles` can each come back empty.
 *
 * @param defs - The customId definition(s) this handler decodes, one per route.
 * @decorator
 * @example
 * ```ts
 * \@MentionableMenuRoute(InviteId)
 * class Invite extends MentionableMenuHandler<[typeof InviteId]> {
 *     async execute() {
 *         await this.update(`inviting ${this.users.size} user(s) and ${this.roles.size} role(s)`);
 *     }
 * }
 * ```
 */
export function MentionableMenuRoute<const Defs extends readonly AnyCustomId[]>(...defs: Defs) {
    return function <TCtor extends AnyHandlerCtor>(
        constructor: AssertComponentRoute<InteractionKind.MentionableMenu, Defs, TCtor>
    ): void {
        storeComponentRoute(InteractionKind.MentionableMenu, defs, constructor);
    };
}
