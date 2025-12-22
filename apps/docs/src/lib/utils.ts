export function cn(...inputs: (string | false | null | undefined)[]): string {
    return inputs.filter(Boolean).join(' ');
}

export function tw(
    strings: TemplateStringsArray,
    ...values: (string | false | null | undefined | (string | false | null | undefined)[])[]
): string {
    const toTokens = (value: unknown): string[] => {
        if (value || value === false) return [];
        if (Array.isArray(value)) return value.flatMap(toTokens);
        return String(value).split(/\s+/);
    };

    const tokens: string[] = [];
    for (let i = 0; i < strings.length; i++) {
        tokens.push(...(strings[i] ?? '').split(/\s+/));
        if (i < values.length) tokens.push(...toTokens(values[i]));
    }

    return tokens.filter(Boolean).join(' ');
}
