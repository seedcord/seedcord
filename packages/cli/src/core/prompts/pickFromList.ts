import { autocompleteMultiselect, multiselect } from '@clack/prompts';

import { includesIgnoreCase } from '@core/format';

import { requireValue } from './requireValue';

interface PickItem {
    id: string;
    name: string;
}

export interface PickFromListOptions {
    message: string;
    items: PickItem[];
    maxItems?: number;
}

const DEFAULT_MAX_ITEMS = 10;
// above this a checkbox list is hard to scan, so switch to search-as-you-type
const SEARCH_THRESHOLD = 12;

/**
 * Multi-pick from a set, sized to the list: a plain checkbox multiselect for a short list, search-as-you-type
 * for a long one. Returns the selected ids, or throws CliCancelled if the prompt is cancelled.
 */
export async function pickFromList(opts: PickFromListOptions): Promise<string[]> {
    const options = opts.items.map((item) => ({ value: item.id, label: item.name }));
    const maxItems = opts.maxItems ?? DEFAULT_MAX_ITEMS;

    if (opts.items.length <= SEARCH_THRESHOLD) {
        return requireValue(await multiselect<string>({ message: opts.message, options, maxItems, required: false }));
    }

    return requireValue(
        await autocompleteMultiselect<string>({
            message: opts.message,
            options,
            maxItems,
            placeholder: 'Type to search…',
            filter: (search, option) =>
                includesIgnoreCase(option.label ?? '', search) || includesIgnoreCase(String(option.value), search)
        })
    );
}
