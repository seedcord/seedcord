import { AutocompleteHandler } from '#handlers/interaction/AutocompleteHandler';

import type { SlashRegistry } from '@seedcord/core';
import type { CacheType } from 'discord.js';

// eslint-disable-next-line @seedcord/interaction-handler-missing-route -- the dispatcher's autocomplete fallback, never registered
export class UnhandledAutocomplete extends AutocompleteHandler<keyof SlashRegistry, CacheType> {
    async execute(): Promise<void> {
        await this.respond([]);
    }
}
