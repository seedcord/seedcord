import uFuzzy from '@leeoniya/ufuzzy';

import { includesIgnoreCase } from '#core/format';

import type { Choice } from './Choice';

// "mhub" finds "Main Hub"
// eslint-disable-next-line new-cap -- external library
const SKIPPED_LETTERS = new uFuzzy({ intraIns: Infinity, intraChars: String.raw`[a-z\d' ]` });
// one wrong, extra, missing or swapped letter per word
// eslint-disable-next-line new-cap -- external library
const ONE_TYPO = new uFuzzy({ intraMode: 1 });
// every order of up to three typed words, 3! searches at most
const WORD_ORDERS = 3;

// best match first. past uFuzzy's 1000-match ranking limit the matches come back in list order
function ranked(search: uFuzzy, labels: string[], filter: string): number[] {
    const [matches, info, order] = search.search(labels, filter, WORD_ORDERS);
    if (!info) return matches ?? [];
    return order.flatMap((at) => info.idx[at] ?? []);
}

// skipped-letter matches, then typo-only matches, then an id that contains the filter
export function matchChoices<Value extends string>(
    choices: readonly Choice<Value>[],
    filter: string
): readonly Choice<Value>[] {
    if (filter.trim() === '') return choices;

    const labels = choices.map((choice) => choice.label);
    const matched = new Set([...ranked(SKIPPED_LETTERS, labels, filter), ...ranked(ONE_TYPO, labels, filter)]);
    for (const [index, choice] of choices.entries()) {
        if (includesIgnoreCase(choice.value, filter)) matched.add(index);
    }

    return [...matched].flatMap((index) => choices[index] ?? []);
}
