import { AutocompleteRoute } from '@seedcord/core';

import { AutocompleteHandler } from '#handlers/interaction/AutocompleteHandler';

import '../registry';

@AutocompleteRoute('ban')
export class BanAutocomplete extends AutocompleteHandler<'ban'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
