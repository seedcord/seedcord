import { autocomplete } from '@clack/prompts';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { requireAnswer } from './requireAnswer';

import type { Option } from '@clack/prompts';
import type { Answers, Step } from '@interview/types';
import type { ColorName } from '@seedcord/types';

export const COLOR_NAMES = [
    'Blurple',
    'Aqua',
    'Blue',
    'DarkAqua',
    'DarkBlue',
    'DarkButNotBlack',
    'DarkerGrey',
    'DarkGold',
    'DarkGreen',
    'DarkGrey',
    'DarkNavy',
    'DarkOrange',
    'DarkPurple',
    'DarkRed',
    'DarkVividPink',
    'Default',
    'Fuchsia',
    'Gold',
    'Green',
    'Grey',
    'Greyple',
    'LightGrey',
    'LuminousVividPink',
    'Navy',
    'NotQuiteBlack',
    'Orange',
    'Purple',
    'Red',
    'White',
    'Yellow',
    'Random'
] satisfies ColorName[];

export type ColorChoice = (typeof COLOR_NAMES)[number];

const VISIBLE_COLORS = 8;

// the framework's resolveColor takes six hex digits with the hash optional
function normalizeHex(raw: string): `#${string}` | null {
    const digits = raw.trim().replace(/^#/, '');
    return /^[\da-f]{6}$/i.test(digits) ? `#${digits.toLowerCase()}` : null;
}

function parseColor(raw: string): Answers['botColor'] {
    const hex = normalizeHex(raw);
    if (hex) return hex;

    const value = raw.trim().toLowerCase();
    const match = COLOR_NAMES.find((name) => name.toLowerCase() === value);
    if (!match) {
        throw new SeedcordError(SeedcordErrorCode.CreateInvalidAnswer, [
            'color',
            `Unknown color "${raw}". Use a color name or a six-digit hex.`
        ]);
    }

    return match;
}

// a typed hex shows up as its own option
function colorOptions(this: { userInput: string }): Option<string>[] {
    const typed = this.userInput.trim();
    const hex = normalizeHex(typed);
    const named = COLOR_NAMES.filter((name) => name.toLowerCase().includes(typed.toLowerCase())).map((name) => ({
        value: name
    }));

    return hex ? [{ value: hex, hint: 'hex' }, ...named] : named;
}

export const botColorStep: Step<'botColor'> = {
    key: 'botColor',
    flag: { name: 'color', description: 'a color name or a six-digit hex', parse: parseColor },
    ask: async () =>
        parseColor(
            requireAnswer(
                await autocomplete<string>({
                    message: 'Pick an accent color, or type a hex',
                    options: colorOptions,
                    initialValue: 'Blurple',
                    placeholder: 'Blurple',
                    maxItems: VISIBLE_COLORS
                })
            )
        )
};
