import { BaseHandler } from '@seedcord/core';
import { AutocompleteRouteBrand, reportedWrite } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { InteractionResponseType, Routes } from 'discord-api-types/v10';

import { HttpSlashOptions } from '#inputs/HttpSlashOptions';
import { apiFor } from '#src/api';
import { slashRouteOf } from '#src/dispatch/slashRouteOf';

import type { Core } from '#interfaces/Core';
import type { API } from '@discordjs/core/http-only';
import type { AutocompleteOptions, DispatchContext, SlashRegistry } from '@seedcord/core';
import type { AutocompletableNames, ChoiceValueOf, EntryFor, FocusedField } from '@seedcord/core/internal';
import type {
    APIApplicationCommandOptionChoice,
    APIApplicationCommandAutocompleteInteraction
} from 'discord-api-types/v10';
import type { Promisable } from 'type-fest';

type FocusedArms<Route extends keyof SlashRegistry, Ret> = {
    [Name in AutocompletableNames<Route>]: (
        value: string,
        respond: (
            choices: readonly APIApplicationCommandOptionChoice<ChoiceValueOf<EntryFor<Route, Name>>>[]
        ) => Promise<void>
    ) => Promisable<Ret>;
};

/**
 * Base class for an autocomplete handler on the HTTP transport.
 *
 * Pass the command route(s) from the generated registry as the generic. Branch on the focused field with
 * `this.match`, read already-entered sibling options with `this.options`, and find which command fired
 * with `this.route`.
 *
 * @typeParam Route - One or more route keys from {@link SlashRegistry}, e.g. `'search'`.
 */
export abstract class AutocompleteHandler<Route extends keyof SlashRegistry> extends BaseHandler<
    APIApplicationCommandAutocompleteInteraction,
    Core
> {
    // keep this ctor. it gives typeof AutocompleteHandler a public construct signature the dispatcher
    // needs, and dropping it (inheriting BaseHandler's protected ctor) collapses the handler ctor type to never.
    constructor(event: APIApplicationCommandAutocompleteInteraction, core: Core, dispatch?: DispatchContext) {
        super(event, core, dispatch, 'interactions');
    }

    // phantom, never set at runtime.
    /** @internal */
    declare readonly [AutocompleteRouteBrand]?: Route;

    /**
     * Typed Discord REST API (`@discordjs/core/http-only`) over `core.rest`, one instance per core.
     */
    protected get api(): API {
        return apiFor(this.core.rest);
    }

    private resolver?: HttpSlashOptions;

    private get reader(): HttpSlashOptions {
        this.resolver ??= new HttpSlashOptions(this.event.data);
        return this.resolver;
    }

    /**
     * The focused option for this interaction. `value` is always the raw partial string the user is typing,
     * even for an integer or number option, so coerce it yourself when you need a number.
     */
    protected get focused(): FocusedField<Route> {
        const focused = this.reader.getFocused();
        if (!focused) throw new SeedcordError(SeedcordErrorCode.AutocompleteNoFocusedOption);
        // the registry constrains the names. a focused field outside it has no arm
        return focused as FocusedField<Route>;
    }

    /**
     * Run the arm for the focused field. An autocomplete always dispatches by which field is focused.
     * Match is how you read it.
     *
     * Provide one arm per autocompletable field across the registered commands, keyed by field name. Each
     * arm receives the focused partial value and a `respond` typed to that field's choice value. The
     * arms must cover every autocompletable field, a missing field or an unknown key is a compile error. A
     * focused field with no arm, only reachable from a stale-deployed command, throws at runtime.
     *
     * @param arms - One handler per autocompletable field, keyed by field name.
     * @returns The result of the arm that ran.
     */
    protected async match<Ret>(arms: FocusedArms<Route, Ret>): Promise<Ret> {
        const { name, value } = this.focused;
        const respond = (choices: readonly APIApplicationCommandOptionChoice[]): Promise<void> => this.respond(choices);
        // justified: FocusedArms is keyed by field literals, the Record cast indexes it with the runtime field name.
        type Arm = (
            value: string,
            respond: (choices: readonly APIApplicationCommandOptionChoice[]) => Promise<void>
        ) => Promisable<Ret>;
        const arm = Object.hasOwn(arms, name) ? (arms as Record<string, Arm>)[name] : undefined;
        if (!arm) throw new SeedcordError(SeedcordErrorCode.AutocompleteMatchArmMissing, [name]);
        return await arm(value, respond);
    }

    /** Send autocomplete suggestions, callback type 8. Prefer {@link match}, which restricts each field's choices to its declared type. */
    protected async respond(choices: readonly APIApplicationCommandOptionChoice[]): Promise<void> {
        // a hand-built handler outside a dispatch carries no route id
        const routeId = this.dispatch?.routeId ?? 'autocomplete';
        await reportedWrite({ bus: this.core.bus, interactionId: this.event.id }, routeId, 'respond', () =>
            this.core.rest.post(Routes.interactionCallback(this.event.id, this.event.token), {
                body: { type: InteractionResponseType.ApplicationCommandAutocompleteResult, data: { choices } }
            })
        );
    }

    /** The firing command route, for a field whose completion differs per registered command. */
    protected get route(): Route {
        return slashRouteOf(this.event.data) as Route;
    }

    /**
     * The already-entered options on this command, restricted to the kinds Discord resolves during autocomplete
     * (string, integer, number, boolean) with every read nullable, since a sibling is partial while the user
     * types the focused field. The focused field is on `this.focused`.
     */
    protected get options(): AutocompleteOptions<Route> {
        // AutocompleteOptions is just the registry-typed view over the getters the reader already exposes
        return this.reader as AutocompleteOptions<Route>;
    }
}
