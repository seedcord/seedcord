import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';

import type { Answers, Step } from '#interview/types';
import type { Choice } from '@seedcord/cli-prompts';
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
        throw new SeedcordTypeError(SeedcordErrorCode.CreateInvalidAnswer, [
            'color',
            `Unknown color "${raw}". Use a color name or a six-digit hex.`
        ]);
    }

    return match;
}

const COLOR_CHOICES = COLOR_NAMES.map((name) => ({ value: name, label: name }));

function typedHex(typed: string): Choice<string> | undefined {
    const hex = normalizeHex(typed);
    return hex ? { value: hex, label: hex, hint: 'hex' } : undefined;
}

export const botColorStep: Step<'botColor'> = {
    key: 'botColor',
    label: 'color',
    flag: { name: 'color', description: 'a color name or a six-digit hex', parse: parseColor },
    ask: async (_answers, prompter) =>
        parseColor(
            await prompter.autocomplete({
                message: 'Pick an accent color, or type a hex',
                placeholder: 'Blurple',
                choices: COLOR_CHOICES,
                typedChoice: typedHex
            })
        ),
    shown: (color) => color
};
