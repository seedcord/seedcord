import { AutocompleteHandler } from '@handlers/interaction/AutocompleteHandler';

import type { SlashOptionRegistry } from '@seedcord/core';
import type { CacheType } from 'discord.js';

/**
 * @internal Default handler for an autocomplete with no registered handler.
 */
// eslint-disable-next-line @seedcord/interaction-handler-missing-route -- the dispatcher's autocomplete fallback, never registered
export class UnhandledAutocomplete extends AutocompleteHandler<keyof SlashOptionRegistry, CacheType> {
    async execute(): Promise<void> {
        await this.respond([]);
    }
}
