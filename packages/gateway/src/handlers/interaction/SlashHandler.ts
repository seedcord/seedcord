import { SlashRouteBrand } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { slashRouteOf } from '#bUtilities/miscellaneous/slashRouteOf';
import { InteractionHandler } from '#handlers/interaction/InteractionHandler';

import type { SlashOptions } from '#inputs/SlashOptions';
import type { SlashRegistry } from '@seedcord/core';
import type { CacheFor } from '@seedcord/core/internal';
import type { CacheType, ChatInputCommandInteraction } from 'discord.js';
import type { Promisable } from 'type-fest';

type SlashMatchArms<Route extends keyof SlashRegistry, Cache extends CacheType, Ret> = {
    [Key in Route]: (options: SlashOptions<Key, Cache>) => Promisable<Ret>;
};

/**
 * Base class for a chat-input (slash) command handler.
 *
 * Pass the route from the generated registry as the generic, the same string as `@SlashRoute`, then read
 * `this.options` for a single command or `this.match` for several. Command authoring stays plain
 * discord.js, `seedcord codegen` reads its `toJSON()` to type these options.
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

    /**
     * The typed options for this command's route. Only the getters for kinds this command declares appear.
     * Each getter's name argument is restricted to that command's options of its kind.
     *
     * - A required option drops the null.
     * - Choices narrow to their literal union.
     * - A channel option declared with `addChannelTypes` narrows to those types.
     *
     * Use `this.event.options` directly for anything outside this view, such as `getSubcommand()`.
     * However, for the common case, the methods in this would suffice.
     */
    protected get options(): SlashOptions<Route, Cache> {
        // the djs resolver already carries every getter. SlashOptions is its stricter registry-typed view.
        return this.event.options as SlashOptions<Route, Cache>;
    }

    /**
     * Run the arm for whichever command fired. Use this only when the handler is registered for several
     * routes.
     *
     * Provide one arm per registered route, keyed by its route string, and each arm receives that route's
     * own narrowed options. The arms must cover every route in the generic, a missing route or an unknown
     * key is a compile error.
     *
     * @param arms - One handler per registered route, keyed by route string.
     * @returns The result of the arm that ran.
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
    protected async match<Ret>(arms: SlashMatchArms<Route, Cache, Ret>): Promise<Ret> {
        const route = slashRouteOf(this.event);
        // justified: SlashMatchArms is keyed by Route literals, so the Record cast indexes it with the runtime route string.
        const arm = Object.hasOwn(arms, route)
            ? (arms as Record<string, (options: SlashOptions<Route, Cache>) => Promisable<Ret>>)[route]
            : undefined;
        if (!arm) throw new SeedcordError(SeedcordErrorCode.SlashMatchArmMissing, [route]);
        return await arm(this.options);
    }
}
