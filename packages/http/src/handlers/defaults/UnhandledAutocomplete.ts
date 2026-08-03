import { AutocompleteHandler } from '@handlers/interaction/AutocompleteHandler';

/**
 * Default handler for autocomplete no manifest row matches.
 * Empty choices are the only legal answer, they clear the pending state.
 *
 * @internal
 */
export class UnhandledAutocomplete extends AutocompleteHandler<never> {
    async execute(): Promise<void> {
        await this.respond([]);
    }
}
