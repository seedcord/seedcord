import { EventHandler } from '#handlers/event/EventHandler';
import { AutocompleteHandler } from '#handlers/interaction';
import { SlashHandler } from '#handlers/interaction/SlashHandler';

import type { EventHandlerConstructor, HandlerSlots } from '#handlers/constructors';
import type { InteractionKind } from '@seedcord/core';
import type { CacheType, Events } from 'discord.js';

// a real handler narrows CacheType through its route. the loader's guard admits those at run time
class Ban extends SlashHandler<never, CacheType> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}

class BanOptions extends AutocompleteHandler<never, CacheType> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}

class Greeter extends EventHandler<Events.MessageCreate> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}

export const slash: HandlerSlots[InteractionKind.Slash] = Ban;
export const autocomplete: HandlerSlots[InteractionKind.Autocomplete] = BanOptions;
export const events: readonly EventHandlerConstructor[] = [Greeter];

// @ts-expect-error a slash handler can't route a button
export const button: HandlerSlots[InteractionKind.Button] = Ban;

// @ts-expect-error the two families keep their own array types
export const crossed: readonly EventHandlerConstructor[] = [Ban];
