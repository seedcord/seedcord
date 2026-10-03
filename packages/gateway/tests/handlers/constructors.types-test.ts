import { EventHandler } from '#handlers/event/EventHandler';
import { AutocompleteHandler } from '#handlers/interaction';
import { SlashHandler } from '#handlers/interaction/SlashHandler';

import type { EventHandlerConstructor, HandlerConstructor } from '#handlers/constructors';
import type { Events } from 'discord.js';

class Ban extends SlashHandler<never> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}

class BanOptions extends AutocompleteHandler<never> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}

class Greeter extends EventHandler<Events.MessageCreate> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}

// a base's own construct signature refuses every subclass that narrows its event
export const handlers: readonly HandlerConstructor[] = [Ban, BanOptions];
export const events: readonly EventHandlerConstructor[] = [Greeter];

// @ts-expect-error the two families keep their own array types
export const crossed: readonly EventHandlerConstructor[] = [Ban];
