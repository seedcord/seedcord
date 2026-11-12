import { runCase, SlashRouteBrand } from '@seedcord/core/internal';

import { InteractionHandler } from '#handlers/interaction/InteractionHandler';
import { HttpSlashOptions } from '#inputs/HttpSlashOptions';

import type { SlashOptions } from '#inputs/SlashOptions';
import type { SlashRegistry } from '@seedcord/core';
import type { CaseReturn, MatchResult, OnlyCases } from '@seedcord/core/internal';
import type { APIChatInputApplicationCommandInteraction } from 'discord-api-types/v10';

type SlashMatchCases<Route extends keyof SlashRegistry, Ret> = {
    [Key in Route]: (options: SlashOptions<Key>) => CaseReturn<Ret>;
};

/**
 * Base class for a chat-input (slash) command handler on the HTTP transport.
 *
 * Pass the route from the generated registry as the generic, then read `this.options` for a single
 * command or `this.match` for several. You build the command with plain discord.js. `seedcord codegen`
 * reads its `toJSON()` to type these options.
 *
 * @typeParam Route - One or more route keys from {@link SlashRegistry}, e.g. `'ban'` or `'ban' | 'kick'`.
 */
export abstract class SlashHandler<
    Route extends keyof SlashRegistry
> extends InteractionHandler<APIChatInputApplicationCommandInteraction> {
    // phantom, never set at runtime.
    /** @internal */
    declare readonly [SlashRouteBrand]?: Route;

    /** The selected command's path, such as `search/docs`. */
    declare protected readonly route: Route;

    #resolver?: HttpSlashOptions;

    /**
     * The typed options for this command's route. Only the getters for kinds this command declares appear.
     * Each getter's name argument is restricted to that command's options of its kind.
     *
     * - A required option's getter never returns `null`.
     *
     * - Choices narrow to their literal union.
     *
     * - A channel option declared with `addChannelTypes` narrows to those types.
     *
     * Rich kinds resolve from the interaction's `resolved` data.
     */
    protected get options(): SlashOptions<Route> {
        this.#resolver ??= new HttpSlashOptions(this.event.data);
        // SlashOptions is only the registry-typed view over the getters the reader already exposes
        return this.#resolver as SlashOptions<Route>;
    }

    /**
     * Run the case for the selected command. Use this only when the handler is registered for several
     * routes.
     *
     * Provide one case per registered route, keyed by its route string, and each case receives that route's
     * own narrowed options. The cases must cover every route in the generic. A missing route or an unknown
     * key is a compile error.
     *
     * @param cases - One handler per registered route, keyed by route string.
     * @typeParam Ret - The type that every case must return. Leave it out to get the union of what the cases return.
     * @returns The result of the case that ran.
     */
    protected async match<Ret = never, Cases extends SlashMatchCases<Route, Ret> = SlashMatchCases<Route, Ret>>(
        cases: OnlyCases<Cases, SlashMatchCases<Route, Ret>>
    ): Promise<MatchResult<Ret, Cases>> {
        return await runCase<MatchResult<Ret, Cases>>(this, cases, 'command route', this.route, this.options);
    }
}
