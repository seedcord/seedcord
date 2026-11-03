import { runCase, SlashRouteBrand } from '@seedcord/core/internal';

import { InteractionHandler } from '#handlers/interaction/InteractionHandler';

import type { SlashOptions } from '#inputs/SlashOptions';
import type { SlashRegistry } from '@seedcord/core';
import type { CacheFor, CaseReturn, MatchResult, OnlyCases } from '@seedcord/core/internal';
import type { CacheType, ChatInputCommandInteraction } from 'discord.js';

// a Cache written on the class wins over the cache of each route
type CaseCache<Route extends keyof SlashRegistry, Cache extends CacheType, Key extends Route> = [Cache] extends [
    CacheFor<Route>
]
    ? CacheFor<Key>
    : Cache;

type SlashMatchCases<Route extends keyof SlashRegistry, Cache extends CacheType, Ret> = {
    [Key in Route]: (options: SlashOptions<Key, CaseCache<Route, Cache, Key>>) => CaseReturn<Ret>;
};

/**
 * Base class for a chat-input (slash) command handler.
 *
 * Pass the route from the generated registry as the generic, the same string as `@SlashRoute`, then read
 * `this.options` for a single command or `this.match` for several. Command authoring stays plain
 * discord.js. `seedcord codegen` reads its `toJSON()` to type these options.
 *
 * @typeParam Route - One or more route keys from {@link SlashRegistry}, e.g. `'ban'` or `'ban' | 'kick'`.
 * @typeParam Cache - The interaction cache state. The command's contexts set it.
 *
 * @example
 * ```ts
 * \@SlashRoute('ban')
 * class BanHandler extends SlashHandler<'ban'> {
 *     async execute() {
 *         const target = this.options.getUser('target'); // User
 *         const reason = this.options.getString('reason'); // string | null
 *     }
 * }
 * ```
 */
export abstract class SlashHandler<
    Route extends keyof SlashRegistry,
    Cache extends CacheType = CacheFor<Route>
> extends InteractionHandler<ChatInputCommandInteraction<Cache>> {
    // phantom, never set at runtime.
    /** @internal */
    declare readonly [SlashRouteBrand]?: Route;

    /** The selected command's path, such as `search/docs`. */
    declare protected readonly route: Route;

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
     * Use `this.event.options` directly for anything outside this view, such as `getSubcommand()`.
     */
    protected get options(): SlashOptions<Route, Cache> {
        // the djs resolver already carries every getter. SlashOptions is its stricter registry-typed view.
        return this.event.options as SlashOptions<Route, Cache>;
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
     *
     * @example
     * ```ts
     * \@SlashRoute('ban', 'kick')
     * class ModHandler extends SlashHandler<'ban' | 'kick'> {
     *     async execute() {
     *         await this.match({
     *             ban: (options) => this.event.guild?.members.ban(options.getUser('target').id),
     *             kick: (options) => this.event.guild?.members.kick(options.getUser('member').id)
     *         });
     *     }
     * }
     * ```
     */
    protected async match<
        Ret = never,
        Cases extends SlashMatchCases<Route, Cache, Ret> = SlashMatchCases<Route, Cache, Ret>
    >(cases: OnlyCases<Cases, SlashMatchCases<Route, Cache, Ret>>): Promise<MatchResult<Ret, Cases>> {
        return await runCase<MatchResult<Ret, Cases>>(this, cases, 'command route', this.route, this.options);
    }
}
