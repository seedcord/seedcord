const UNIT_MS = {
    ms: 1,
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000
} as const;

type DurationUnit = keyof typeof UNIT_MS;

const DURATION_PATTERN = new RegExp(`^(\\d+)(${Object.keys(UNIT_MS).join('|')})$`);

/**
 * Parses a short duration string like `24h`, `30m`, `90s`, `7d`, or `500ms` into milliseconds.
 *
 * The grammar is one or more digits followed by one lowercase unit (`ms`, `s`, `m`, `h`, `d`).
 * Anything else returns `null`, including a bare number, an unknown unit, an uppercase unit,
 * surrounding whitespace, a fractional value, and a result of zero. The return is a positive
 * number or `null`, never `0` or `NaN`, so a malformed input can never read as a valid duration.
 *
 * @param input - The duration string to parse.
 * @returns The duration in milliseconds, or `null` if `input` is not a well-formed positive duration.
 */
export function parseDuration(input: string): number | null {
    const match = DURATION_PATTERN.exec(input);
    if (!match) return null;

    const ms = Number(match[1]) * UNIT_MS[match[2] as DurationUnit];
    return ms > 0 ? ms : null;
}
