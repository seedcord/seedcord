import { InteractionHandler } from '@handlers/interaction/InteractionHandler';

import type { SlashOptionRegistry } from '@seedcord/core';
import type { APIChatInputApplicationCommandInteraction } from 'discord-api-types/v10';

/**
 * Base class for a chat-input (slash) command handler on the HTTP transport.
 *
 * Pass the route from the generated registry as the generic, the same string as `@SlashRoute`. Reply through
 * the handler members (`this.reply`, `this.defer`, ...). Command authoring stays plain discord.js,
 * `seedcord codegen` reads its `toJSON()` to type these routes.
 *
 * @typeParam Route - One or more route keys from {@link SlashOptionRegistry}, e.g. `'ban'` or `'ban' | 'kick'`.
 */
export abstract class SlashHandler<
    Route extends keyof SlashOptionRegistry
> extends InteractionHandler<APIChatInputApplicationCommandInteraction> {
    // anchors the Route generic until the option resolver reads it, this.event carries the raw payload meanwhile
    declare protected readonly __route?: Route;
}
