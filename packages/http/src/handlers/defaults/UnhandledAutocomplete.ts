import { AutocompleteHandler } from '@handlers/interaction/AutocompleteHandler';

// dispatch falls back here when no manifest row matches
// discord requires empty choices here, which clears the pending autocomplete state
export class UnhandledAutocomplete extends AutocompleteHandler<never> {
    async execute(): Promise<void> {
        await this.respond([]);
    }
}
