import { ApplicationCommandType } from 'discord-api-types/v10';

import {
    contextMenuRouteOf,
    selectMenuRouteOf,
    storeComponentRoute,
    storeInteractionRoute
} from '#decorators/interactionRoutes';
import { InteractionRoutes } from '#src/metadataKeys';

import type { AnyCustomId } from '#customId/CustomId';
import type { SelectMenuKind } from '#decorators/interactionRoutes';
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
import type { Constructor } from 'type-fest';

type ComponentBrand = 'button' | 'modal' | SelectMenuKind;

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

// one assignability direction for the defs, a bidirectional check would reject const-inferred readonly tuples
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
        storeInteractionRoute(InteractionRoutes.Slash, routes, constructor);
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
        storeInteractionRoute(InteractionRoutes.Autocomplete, routes, constructor);
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
    return function <TCtor extends AnyHandlerCtor>(constructor: AssertComponentRoute<'button', Defs, TCtor>): void {
        storeComponentRoute(InteractionRoutes.Button, defs, constructor);
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
    return function <TCtor extends AnyHandlerCtor>(constructor: AssertComponentRoute<'modal', Defs, TCtor>): void {
        storeComponentRoute(InteractionRoutes.Modal, defs, constructor);
    };
}

/**
 * Routes select menu interactions to handler classes.
 *
 * Pass the select kind and the {@link CustomId} definition(s) this handler decodes. The handler's
 * generic must list the same kind and definitions, or it is a compile error.
 *
 * @param type - Select menu kind from {@link SelectMenuKind}.
 * @param defs - The customId definition(s) this handler decodes, one per route.
 * @decorator
 *
 * @example
 * ```typescript
 * \@SelectMenuRoute(SelectMenuKind.User, AssignId)
 * class AssignSelect extends SelectMenuHandler<SelectMenuKind.User, [typeof AssignId]> {}
 * ```
 */
export function SelectMenuRoute<const Kind extends SelectMenuKind, const Defs extends readonly AnyCustomId[]>(
    type: Kind,
    ...defs: Defs
) {
    return function <TCtor extends AnyHandlerCtor>(constructor: AssertComponentRoute<Kind, Defs, TCtor>): void {
        storeComponentRoute(selectMenuRouteOf(type), defs, constructor);
    };
}
