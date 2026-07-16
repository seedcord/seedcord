import {
    contextMenuRouteOf,
    selectMenuRouteOf,
    storeComponentRoute,
    storeInteractionRoute
} from '@decorators/interactionRoutes';
import { InteractionRoutes } from '@src/metadataKeys';

import type { AnyCustomId } from '@customId/CustomId';
import type { SelectMenuKind } from '@decorators/interactionRoutes';
import type { MessageContextMenuRegistry, UserContextMenuRegistry } from '@registries/ContextMenuRegistry';
import type { SlashOptionRegistry } from '@registries/SlashOptionRegistry';
import type { ApplicationCommandType } from 'discord-api-types/v10';
import type { Constructor } from 'type-fest';

type ContextMenuKind = ApplicationCommandType.User | ApplicationCommandType.Message;

type ComponentBrand = 'button' | 'modal' | SelectMenuKind;

// phantom brands keep the decorators off transport-specific classes
type AnyHandlerCtor = new (...args: any[]) => unknown;

type SlashRouteOf<TCtor extends AnyHandlerCtor> =
    InstanceType<TCtor> extends {
        __slashRoute?: infer Route extends keyof SlashOptionRegistry;
    }
        ? Route
        : never;

type AutocompleteRouteOf<TCtor extends AnyHandlerCtor> =
    InstanceType<TCtor> extends {
        __autocompleteRoute?: infer Route extends keyof SlashOptionRegistry;
    }
        ? Route
        : never;

type ContextMenuKindOf<TCtor extends AnyHandlerCtor> =
    InstanceType<TCtor> extends {
        __ctxKind?: infer Kind extends ContextMenuKind;
    }
        ? Kind
        : never;

type ComponentOf<TCtor extends AnyHandlerCtor> =
    InstanceType<TCtor> extends {
        __component?: infer Brand extends ComponentBrand;
    }
        ? Brand
        : never;

type DefsOf<TCtor extends AnyHandlerCtor> =
    InstanceType<TCtor> extends {
        __componentDefs?: infer Defs extends readonly AnyCustomId[];
    }
        ? Defs
        : never;

type AssertSlashRoute<Route extends keyof SlashOptionRegistry, TCtor extends AnyHandlerCtor> = [Route] extends [
    SlashRouteOf<TCtor>
]
    ? [SlashRouteOf<TCtor>] extends [Route]
        ? TCtor
        : Constructor<['SlashHandler declares a route the SlashRoute decorator does not list', SlashRouteOf<TCtor>]>
    : Constructor<['SlashRoute does not match the SlashHandler generic', Route]>;

type AssertAutocompleteRoute<Route extends keyof SlashOptionRegistry, TCtor extends AnyHandlerCtor> = [Route] extends [
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

type AssertContextMenuRoute<Kind extends ContextMenuKind, TCtor extends AnyHandlerCtor> = [Kind] extends [
    ContextMenuKindOf<TCtor>
]
    ? [ContextMenuKindOf<TCtor>] extends [Kind]
        ? TCtor
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

type NamesFor<Kind extends ContextMenuKind> = Kind extends ApplicationCommandType.User
    ? keyof UserContextMenuRegistry
    : keyof MessageContextMenuRegistry;

/**
 * Routes one or more slash commands to a `SlashHandler`.
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
 */
export function SlashRoute<const Route extends keyof SlashOptionRegistry>(...routes: Route[]) {
    return function <TCtor extends AnyHandlerCtor>(constructor: AssertSlashRoute<Route, TCtor>): void {
        storeInteractionRoute(InteractionRoutes.Slash, routes, constructor);
    };
}

/**
 * Routes one or more commands' autocomplete to an `AutocompleteHandler`.
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
    return function <TCtor extends AnyHandlerCtor>(constructor: AssertAutocompleteRoute<Route, TCtor>): void {
        storeInteractionRoute(InteractionRoutes.Autocomplete, routes, constructor);
    };
}

/**
 * Routes one or more context-menu commands to a `ContextMenuHandler`.
 *
 * Pass the kind (`ApplicationCommandType.User` or `ApplicationCommandType.Message`) and the command name(s),
 * each checked against that kind's registry, so a typo is a compile error. The handler's generic must
 * declare the same kind, cross-checked both directions. Context menus carry no options, so a multi-name
 * handler reads `this.target` uniformly with no branch.
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
export function ContextMenuRoute<const Kind extends ContextMenuKind>(kind: Kind, ...names: NamesFor<Kind>[]) {
    return function <TCtor extends AnyHandlerCtor>(constructor: AssertContextMenuRoute<Kind, TCtor>): void {
        storeInteractionRoute(contextMenuRouteOf(kind), names, constructor);
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
 * matches the stable prefix, so an older-shape wire still reaches the handler and throws StaleCustomId
 * on read, the same as a button route.
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
