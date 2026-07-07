import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { slashRouteOf } from '@bUtilities/miscellaneous/slashRouteOf';
import { BaseHandler } from '@handlers/BaseHandler';

import type { Handler } from '@handlers/BaseHandler';
import type { AutocompleteOptions } from '@inputs/AutocompleteOptions';
import type { Core } from '@interfaces/Core';
import type { DispatchContext, SlashOptionRegistry } from '@seedcord/core';
import type { ApplicationCommandOptionChoiceData, AutocompleteInteraction, CacheType } from 'discord.js';
import type { Promisable } from 'type-fest';

type Row<Route extends keyof SlashOptionRegistry> = SlashOptionRegistry[Route];

// distributes over a union Route so a multi-command handler sees the union of every command's autocompletable
// fields. keyof a union row would intersect to only the names common to all commands instead.
type AutocompletableNames<Route extends keyof SlashOptionRegistry> = Route extends unknown
    ? {
          [Name in keyof Row<Route>]: Row<Route>[Name] extends { autocomplete: true } ? Name : never;
      }[keyof Row<Route>]
    : never;

// the registry entry for one field name, gathered across every registered command that declares it.
type EntryFor<Route extends keyof SlashOptionRegistry, Name extends PropertyKey> = Route extends unknown
    ? Name extends keyof Row<Route>
        ? Row<Route>[Name]
        : never
    : never;

// the choice value Discord expects for an autocompletable option, string for a string option and number for
// an integer or number option. distributes over a mixed-kind union to widen to string | number.
type ChoiceValueOf<Entry> = Entry extends { kind: 'string' }
    ? string
    : Entry extends { kind: 'integer' | 'number' }
      ? number
      : never;

/** The focused option. `value` is the raw partial Discord delivers mid-type, always a string regardless of kind. */
interface FocusedField<Route extends keyof SlashOptionRegistry> {
    name: AutocompletableNames<Route>;
    value: string;
}

/** One arm per autocompletable field, `value` is the focused partial, `respond` is pinned to the field's choice type. */
type FocusedArms<Route extends keyof SlashOptionRegistry, Ret> = {
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
 * @typeParam Route - One or more route keys from {@link SlashOptionRegistry}, e.g. `'search'` or `'search' | 'find'`.
 * @typeParam Cache - The interaction cache state, `'cached'` by default.
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
export abstract class AutocompleteHandler<Route extends keyof SlashOptionRegistry, Cache extends CacheType = 'cached'>
    extends BaseHandler<AutocompleteInteraction<Cache>>
    implements Handler
{
    // keep this ctor. it gives typeof AutocompleteHandler a public construct signature that HandlerConstructor
    // needs, and dropping it (inheriting BaseHandler's protected ctor) collapses HandlerConstructor to never.
    constructor(event: AutocompleteInteraction<Cache>, core: Core, dispatch?: DispatchContext) {
        super(event, core, dispatch);
    }

    /**
     * The focused option for this interaction. `value` is always the raw partial string the user is typing,
     * even for an integer or number option, so coerce it yourself when you need a number.
     */
    private decodedFocused?: { name: string; value: string };

    protected get focused(): FocusedField<Route> {
        if (this.decodedFocused) return this.decodedFocused as FocusedField<Route>;
        const raw = this.event.options.getFocused(true);
        const focused = { name: raw.name, value: raw.value };
        this.decodedFocused = focused;
        // the registry fixes the autocompletable names, a focused field outside that set fails the match lookup.
        return focused as FocusedField<Route>;
    }

    /**
     * Run the arm for the focused field. An autocomplete always dispatches by which field is focused, so
     * match is how you read it. There is no single-field shortcut the way slash/component handlers have one.
     *
     * Provide one arm per autocompletable field across the registered commands, keyed by field name. Each
     * arm receives the focused partial value and a `respond` pinned to that field's choice value type. The
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
            this.event.respond(choices);
        // justified: FocusedArms is keyed by field literals, the Record cast indexes it with the runtime field name.
        type Arm = (
            value: string,
            respond: (choices: readonly ApplicationCommandOptionChoiceData[]) => Promise<void>
        ) => Promisable<Ret>;
        const arm = (arms as Record<string, Arm>)[name];
        if (!arm) throw new SeedcordError(SeedcordErrorCode.AutocompleteMatchArmMissing, [name]);
        return await arm(value, respond);
    }

    /** The firing command route, for a field whose completion differs per registered command. */
    protected get route(): Route {
        return slashRouteOf(this.event) as Route;
    }

    /**
     * The already-entered options on this command, restricted to the kinds Discord resolves during autocomplete
     * (string, integer, number, boolean) with every read nullable, since a sibling is partial while the user
     * types the focused field. Read the focused field from `this.focused`, not here.
     */
    protected get options(): AutocompleteOptions<Route> {
        // the autocomplete resolver already carries these getters, AutocompleteOptions is its registry-typed view.
        return this.event.options as AutocompleteOptions<Route>;
    }
}
