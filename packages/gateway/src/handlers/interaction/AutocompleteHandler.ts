import { AutocompleteRouteBrand, reportedWrite } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { slashRouteOf } from '#bUtilities/miscellaneous/slashRouteOf';
import { BaseHandler } from '#src/handlers/BaseHandler';

import type { Core } from '#interfaces/Core';
import type { AutocompleteOptions, DispatchContext, SlashRegistry } from '@seedcord/core';
import type { AutocompletableNames, CacheFor, ChoiceValueOf, EntryFor, FocusedField } from '@seedcord/core/internal';
import type { ApplicationCommandOptionChoiceData, AutocompleteInteraction, CacheType } from 'discord.js';
import type { Promisable } from 'type-fest';

type FocusedArms<Route extends keyof SlashRegistry, Ret> = {
    [Name in AutocompletableNames<Route>]: (
        value: string,
        respond: (
            choices: readonly ApplicationCommandOptionChoiceData<ChoiceValueOf<EntryFor<Route, Name>>>[]
        ) => Promise<void>
    ) => Promisable<Ret>;
};

/**
 * Base class for a Discord autocomplete handler.
 *
 * Pass the command route(s) from the generated registry as the generic, the same string(s) as
 * `@AutocompleteRoute`. Branch on the focused field with `this.match`, read already-entered sibling options
 * with `this.options`, and find which command fired with `this.route`.
 *
 * @typeParam Route - One or more route keys from {@link SlashRegistry}, e.g. `'search'` or `'search' | 'find'`.
 * @typeParam Cache - The interaction cache state. The command's contexts set it.
 *
 * @example
 * ```ts
 * \@AutocompleteRoute('search')
 * class SearchAutocomplete extends AutocompleteHandler<'search'> {
 *     async execute() {
 *         await this.match({
 *             query: (value, respond) => respond([{ name: value, value }])
 *         });
 *     }
 * }
 * ```
 */
export abstract class AutocompleteHandler<
    Route extends keyof SlashRegistry,
    Cache extends CacheType = CacheFor<Route>
> extends BaseHandler<AutocompleteInteraction<Cache>> {
    // phantom, never set at runtime.
    /** @internal */
    declare readonly [AutocompleteRouteBrand]?: Route;

    // keep this ctor. it gives typeof AutocompleteHandler a public construct signature that HandlerConstructor
    // needs, and dropping it (inheriting BaseHandler's protected ctor) collapses HandlerConstructor to never.
    constructor(event: AutocompleteInteraction<Cache>, core: Core, dispatch?: DispatchContext) {
        super(event, core, dispatch, 'interactions');
    }

    private decodedFocused?: { name: string; value: string };

    /**
     * The focused option for this interaction. `value` is always the raw partial string the user is typing,
     * even for an integer or number option, so coerce it yourself when you need a number.
     */
    protected get focused(): FocusedField<Route> {
        if (this.decodedFocused) return this.decodedFocused as FocusedField<Route>;
        const raw = this.event.options.getFocused(true);
        const focused = { name: raw.name, value: raw.value };
        this.decodedFocused = focused;
        // the registry constrains the names. a focused field outside the set has no arm.
        return focused as FocusedField<Route>;
    }

    /**
     * Run the arm for the focused field. Because an autocomplete always dispatches by which field is
     * focused, match is how you read it. There is no single-field shortcut the way slash/component handlers have one.
     *
     * Provide one arm per autocompletable field across the registered commands, keyed by field name. Each
     * arm receives the focused partial value and a `respond` typed to that field's choice value. The
     * arms must cover every autocompletable field, a missing field or an unknown key is a compile error. A
     * focused field with no arm, only reachable from a stale-deployed command, throws at runtime.
     *
     * @param arms - One handler per autocompletable field, keyed by field name.
     * @returns The result of the arm that ran.
     *
     * @example
     * ```ts
     * \@AutocompleteRoute('search')
     * class SearchAutocomplete extends AutocompleteHandler<'search'> {
     *     async execute() {
     *         await this.match({
     *             query: (value, respond) => respond(titles(value).map((s) => ({ name: s, value: s }))),
     *             tag: (value, respond) => respond(tags(value).map((s) => ({ name: s, value: s })))
     *         });
     *     }
     * }
     * ```
     */
    protected async match<Ret>(arms: FocusedArms<Route, Ret>): Promise<Ret> {
        const { name, value } = this.focused;
        const respond = (choices: readonly ApplicationCommandOptionChoiceData[]): Promise<void> =>
            this.respond(choices);
        // justified: FocusedArms is keyed by field literals, so the Record cast indexes it with the runtime field name.
        type Arm = (
            value: string,
            respond: (choices: readonly ApplicationCommandOptionChoiceData[]) => Promise<void>
        ) => Promisable<Ret>;
        const arm = Object.hasOwn(arms, name) ? (arms as Record<string, Arm>)[name] : undefined;
        if (!arm) throw new SeedcordError(SeedcordErrorCode.AutocompleteMatchArmMissing, [name]);
        return await arm(value, respond);
    }

    /** Send autocomplete suggestions, callback type 8. Prefer {@link match}, which restricts each field's choices to its declared type. */
    protected async respond(choices: readonly ApplicationCommandOptionChoiceData[]): Promise<void> {
        // a hand-built handler outside a dispatch carries no route id
        const routeId = this.dispatch?.routeId ?? 'autocomplete';
        await reportedWrite({ bus: this.core.bus, interactionId: this.event.id }, routeId, 'respond', () =>
            // eslint-disable-next-line @seedcord/no-raw-interaction-acks -- this is the base respond and calls djs directly
            this.event.respond(choices)
        );
    }

    /** The firing command route, for a field whose completion differs per registered command. */
    protected get route(): Route {
        return slashRouteOf(this.event) as Route;
    }

    /**
     * The already-entered options on this command, restricted to the kinds Discord resolves during autocomplete
     * (string, integer, number, boolean) with every read nullable, since a sibling is partial while the user
     * types the focused field. The focused field is on `this.focused`.
     */
    protected get options(): AutocompleteOptions<Route> {
        // the djs resolver exposes these getters. AutocompleteOptions is the registry-typed view over it.
        return this.event.options as AutocompleteOptions<Route>;
    }
}
