import { BaseHandler } from '@seedcord/core';
import { AutocompleteRouteBrand, runCase } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { interactionUser } from '#handlers/interactionUser';
import { HttpSlashOptions } from '#inputs/HttpSlashOptions';
import { apiFor } from '#src/api';

import type { Core } from '#interfaces/Core';
import type { API } from '@discordjs/core/http-only';
import type { AutocompleteOptions, DispatchContext, SlashRegistry } from '@seedcord/core';
import type {
    AutocompletableNames,
    AutocompleteResponder,
    CaseReturn,
    ChoiceValueOf,
    EntryFor,
    FocusedField,
    MatchResult,
    OnlyCases
} from '@seedcord/core/internal';
import type {
    APIApplicationCommandOptionChoice,
    APIApplicationCommandAutocompleteInteraction,
    APIUser
} from 'discord-api-types/v10';

type FocusedCases<Route extends keyof SlashRegistry, Ret> = {
    [Name in AutocompletableNames<Route>]: (
        value: string,
        respond: (
            choices: readonly APIApplicationCommandOptionChoice<ChoiceValueOf<EntryFor<Route, Name>>>[]
        ) => Promise<void>
    ) => CaseReturn<Ret>;
};

/**
 * Base class for an autocomplete handler on the HTTP transport.
 *
 * Pass the command route(s) from the generated registry as the generic. Branch on the focused field with
 * `this.match`, read already-entered sibling options with `this.options`, and read the selected command's
 * path from `this.route`.
 *
 * @typeParam Route - One or more route keys from {@link SlashRegistry}, e.g. `'search'`.
 */
export abstract class AutocompleteHandler<Route extends keyof SlashRegistry> extends BaseHandler<
    APIApplicationCommandAutocompleteInteraction,
    Core
> {
    // keep this ctor. inheriting BaseHandler's protected one collapses the handler ctor type to never.
    constructor(
        event: APIApplicationCommandAutocompleteInteraction,
        core: Core,
        dispatch: DispatchContext,
        responder: AutocompleteResponder<APIApplicationCommandOptionChoice>
    ) {
        super(event, core, dispatch, 'interactions');
        this.#responder = responder;
    }

    readonly #responder: AutocompleteResponder<APIApplicationCommandOptionChoice>;

    // phantom, never set at runtime.
    /** @internal */
    declare readonly [AutocompleteRouteBrand]?: Route;

    /**
     * Typed Discord REST API (`@discordjs/core/http-only`) over `core.rest`, one instance per core.
     */
    protected get api(): API {
        return apiFor(this.core.rest);
    }

    /** The user who sent this interaction, read from `member.user` in a guild and `user` in a DM. */
    protected get user(): APIUser {
        return interactionUser(this.event);
    }

    #resolver?: HttpSlashOptions;

    private get reader(): HttpSlashOptions {
        this.#resolver ??= new HttpSlashOptions(this.event.data);
        return this.#resolver;
    }

    /**
     * The focused option for this interaction. `value` is always the raw partial string the user is typing,
     * even for an integer or number option, so coerce it yourself when you need a number.
     */
    protected get focused(): FocusedField<Route> {
        const focused = this.reader.getFocused();
        if (!focused) throw new SeedcordError(SeedcordErrorCode.AutocompleteNoFocusedOption);
        // the registry constrains the names
        return focused as FocusedField<Route>;
    }

    /**
     * Run the case for the focused field. An autocomplete always dispatches by which field is focused.
     * Match is how you read it.
     *
     * Provide one case per autocompletable field across the registered commands, keyed by field name. Each
     * case receives the focused partial value and a `respond` typed to that field's choice value. The
     * cases must cover every autocompletable field. A missing field or an unknown key is a compile error.
     *
     * @param cases - One handler per autocompletable field, keyed by field name.
     * @typeParam Ret - The type that every case must return. Leave it out to get the union of what the cases return.
     * @returns The result of the case that ran.
     * @throws A **SeedcordTypeError** with `MatchCaseMissing` when the focused field doesn't have a case. Only a stale-deployed command can send one.
     */
    protected async match<Ret = never, Cases extends FocusedCases<Route, Ret> = FocusedCases<Route, Ret>>(
        cases: OnlyCases<Cases, FocusedCases<Route, Ret>>
    ): Promise<MatchResult<Ret, Cases>> {
        const { name, value } = this.focused;
        const respond = (choices: readonly APIApplicationCommandOptionChoice[]): Promise<void> => this.respond(choices);
        return await runCase<MatchResult<Ret, Cases>>(this, cases, 'focused field', name, value, respond);
    }

    /** Send autocomplete suggestions, callback type 8. Prefer {@link match}, which restricts each field's choices to its declared type. */
    protected respond(choices: readonly APIApplicationCommandOptionChoice[]): Promise<void> {
        return this.#responder.respond(choices);
    }

    /** The selected command's path, such as `search/docs`, without the interaction-kind prefix. */
    declare protected readonly route: Route;

    /**
     * The already-entered options on this command, restricted to the kinds Discord resolves during autocomplete
     * (string, integer, number, boolean) with every read nullable, since a sibling is partial while the user
     * types the focused field. The focused field is on `this.focused`.
     */
    protected get options(): AutocompleteOptions<Route> {
        // AutocompleteOptions is the registry-typed view over the getters that the reader exposes
        return this.reader as AutocompleteOptions<Route>;
    }
}
