import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { InteractionHandler } from '@handlers/interaction/InteractionHandler';
import { HttpSlashOptions } from '@inputs/HttpSlashOptions';
import { slashRouteOf } from '@src/dispatch/slashRouteOf';

import type { SlashOptions } from '@inputs/SlashOptions';
import type { SlashOptionRegistry } from '@seedcord/core';
import type { APIChatInputApplicationCommandInteraction } from 'discord-api-types/v10';
import type { Promisable } from 'type-fest';

type SlashMatchArms<Route extends keyof SlashOptionRegistry, Ret> = {
    [Key in Route]: (options: SlashOptions<Key>) => Promisable<Ret>;
};

/**
 * Base class for a chat-input (slash) command handler on the HTTP transport.
 *
 * Pass the route from the generated registry as the generic, then read `this.options` for a single
 * command or `this.match` for several. Command authoring stays plain discord.js, `seedcord codegen`
 * reads its `toJSON()` to type these options.
 *
 * @typeParam Route - One or more route keys from {@link SlashOptionRegistry}, e.g. `'ban'` or `'ban' | 'kick'`.
 */
export abstract class SlashHandler<
    Route extends keyof SlashOptionRegistry
> extends InteractionHandler<APIChatInputApplicationCommandInteraction> {
    // phantom, never set at runtime.
    /** @internal */
    declare readonly __slashRoute?: Route;

    private resolver?: HttpSlashOptions;

    /**
     * The typed options for this command's route. Required options drop the null, choices narrow to their
     * literal union, and only the getters for kinds this command actually uses appear. Rich kinds resolve
     * from the interaction's `resolved` data.
     */
    protected get options(): SlashOptions<Route> {
        this.resolver ??= new HttpSlashOptions(this.event.data);
        // the reader exposes every getter, SlashOptions is the registry-typed view over it.
        return this.resolver as SlashOptions<Route>;
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
     */
    protected async match<Ret>(arms: SlashMatchArms<Route, Ret>): Promise<Ret> {
        const route = slashRouteOf(this.event.data);
        // justified: SlashMatchArms is keyed by Route literals, the Record cast indexes it with the runtime route string.
        const arm = (arms as Record<string, (options: SlashOptions<Route>) => Promisable<Ret>>)[route];
        if (!arm) throw new SeedcordError(SeedcordErrorCode.SlashMatchArmMissing, [route]);
        return await arm(this.options);
    }
}
