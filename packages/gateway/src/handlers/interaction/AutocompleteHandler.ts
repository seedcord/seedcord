import { AutocompleteRouteBrand, reportedWrite } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';

import { slashRouteOf } from '#bUtilities/miscellaneous/slashRouteOf';
import { BaseHandler } from '#src/handlers/BaseHandler';

import type { Core } from '#interfaces/Core';
import type { AutocompleteOptions, DispatchContext, SlashRegistry } from '@seedcord/core';
import type { AutocompletableNames, CacheFor, ChoiceValueOf, EntryFor, FocusedField } from '@seedcord/core/internal';
import type { ApplicationCommandOptionChoiceData, AutocompleteInteraction, CacheType } from 'discord.js';
import type { Promisable } from 'type-fest';

type FocusedCases<Route extends keyof SlashRegistry, Ret> = {
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
 * with `this.options`, and read the selected command's path from `this.route`.
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

    // keep this ctor. inheriting BaseHandler's protected one collapses HandlerConstructor to never.
    constructor(event: AutocompleteInteraction<Cache>, core: Core, dispatch: DispatchContext) {
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
        // the registry constrains the names
        return focused as FocusedField<Route>;
    }

    /**
     * Run the case for the focused field. Because an autocomplete always dispatches by which field is
     * focused, match is how you read it. There is no single-field shortcut the way slash/component handlers have one.
     *
     * Provide one case per autocompletable field across the registered commands, keyed by field name. Each
     * case receives the focused partial value and a `respond` typed to that field's choice value. The
     * cases must cover every autocompletable field. A missing field or an unknown key is a compile error.
     *
     * @param cases - One handler per autocompletable field, keyed by field name.
     * @returns The result of the case that ran.
     * @throws A **SeedcordTypeError** with `MatchCaseMissing` when the focused field doesn't have a case. Only a stale-deployed command can send one.
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
    protected async match<Ret>(cases: FocusedCases<Route, Ret>): Promise<Ret> {
        const { name, value } = this.focused;
        const respond = (choices: readonly ApplicationCommandOptionChoiceData[]): Promise<void> =>
            this.respond(choices);
        // justified: FocusedCases is keyed by field literals, so the Record cast indexes it with the runtime field name.
        type Case = (
            value: string,
            respond: (choices: readonly ApplicationCommandOptionChoiceData[]) => Promise<void>
        ) => Promisable<Ret>;
        const callback = Object.hasOwn(cases, name) ? (cases as Record<string, Case>)[name] : undefined;
        if (!callback)
            throw new SeedcordTypeError(SeedcordErrorCode.MatchCaseMissing, [
                this.constructor.name,
                'focused field',
                name
            ]);
        return await callback(value, respond);
    }

    /** Send autocomplete suggestions, callback type 8. Prefer {@link match}, which restricts each field's choices to its declared type. */
    protected async respond(choices: readonly ApplicationCommandOptionChoiceData[]): Promise<void> {
        await reportedWrite(
            { bus: this.core.bus, dispatch: this.dispatch, interactionId: this.event.id },
            'respond',
            () =>
                // eslint-disable-next-line @seedcord/no-raw-interaction-acks -- this is the base respond and calls djs directly
                this.event.respond(choices)
        );
    }

    /** The selected command's path, such as `search/docs`, without the interaction-kind prefix. */
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
