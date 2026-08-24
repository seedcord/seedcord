import type { CacheFor, SlashRegistry } from '@seedcord/core';
import type { SlashOptions as OptionView } from '@seedcord/core/internal';
import type { CacheType, CommandInteractionOption } from 'discord.js';

interface GatewayLens<Cache extends CacheType> {
    user: NonNullable<CommandInteractionOption<Cache>['user']>;
    member: NonNullable<CommandInteractionOption<Cache>['member']>;
    channel: NonNullable<CommandInteractionOption<Cache>['channel']>;
    role: NonNullable<CommandInteractionOption<Cache>['role']>;
    mentionable: NonNullable<CommandInteractionOption<Cache>['member' | 'role' | 'user']>;
    attachment: NonNullable<CommandInteractionOption<Cache>['attachment']>;
}

/**
 * The typed view over a chat-input command's options for one route. Each getter mirrors the discord.js
 * resolver method but restricts its `name` to that route's options of the matching kind, drops the null
 * on required options, narrows `choices` to their literal union, and only appears when the route has an
 * option of that kind. The rich kinds return exactly what the djs resolver returns.
 *
 * A channel option declared with `addChannelTypes` narrows `getChannel` to the matching channel subtype.
 * Pass the raw `this.event.options` resolver for anything this view does not cover.
 *
 * @typeParam Route - A route key from the generated {@link SlashRegistry}.
 * @typeParam Cache - The interaction cache state. The command's contexts set it.
 */
export type SlashOptions<Route extends keyof SlashRegistry, Cache extends CacheType = CacheFor<Route>> = OptionView<
    Route,
    GatewayLens<Cache>
>;
