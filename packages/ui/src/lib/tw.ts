import { twMerge } from 'tailwind-merge';

type TwValue = string | false | null | undefined | TwValue[];

export function tw(strings: TemplateStringsArray, ...values: TwValue[]): string {
    const toTokens = (value: TwValue): string[] => {
        if (value === null || value === undefined || value === false || value === '') return [];
        if (Array.isArray(value)) return value.flatMap(toTokens);
        return value.split(/\s+/);
    };

    const tokens: string[] = [];
    for (let i = 0; i < strings.length; i++) {
        tokens.push(...(strings[i] ?? '').split(/\s+/));
        if (i < values.length) tokens.push(...toTokens(values[i]));
    }

    return twMerge(tokens);
}
