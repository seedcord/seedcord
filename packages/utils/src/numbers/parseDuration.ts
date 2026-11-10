import type { IsDigits, StripZeros } from './IsDigits';

const UNIT_MS = {
    ms: 1,
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000
} as const;

type DurationUnit = keyof typeof UNIT_MS;

// check ms before the other units, since '500ms' also ends in 's'
type Amount<TText extends string> = TText extends `${infer Value}ms`
    ? Value
    : TText extends `${infer Value}${Exclude<DurationUnit, 'ms'>}`
      ? Value
      : never;

type IsPositiveWhole<Value extends string> =
    IsDigits<Value> extends true ? (StripZeros<Value> extends '0' ? false : true) : false;

/**
 * A duration string that {@link parseDuration} accepts, like `'30m'`, `'24h'`, or `'500ms'`. It's a
 * whole number above 0, followed by one of the units `ms`, `s`, `m`, `h`, or `d`.
 *
 * Use it to make your own function reject a bad duration at compile time. The example below shows
 * how. A call like `every('1.5h')` then fails to compile, and the error explains what a duration
 * looks like. A value typed as `string`, like one from `.env`, still compiles, so check it with
 * `parseDuration` at run time.
 *
 * @typeParam TText - The literal to check.
 * @example
 * ```ts
 * declare function every<const TText extends string>(duration: ValidDuration<TText>): void;
 *
 * every('90s');
 * every('1.5h'); // fails to compile
 * ```
 */
export type ValidDuration<TText extends string> = string extends TText ? TText : EachDuration<TText>;

// distributes over a union. One valid member can't let an invalid one through
type EachDuration<TText extends string> = TText extends string
    ? IsPositiveWhole<Amount<TText>> extends true
        ? TText
        : `'${TText}' isn't a duration. Write a whole number above 0 and a unit (ms, s, m, h or d), like '90s' or '2h'`
    : never;

const DURATION_PATTERN = new RegExp(String.raw`^(\d+)(${Object.keys(UNIT_MS).join('|')})$`);

/**
 * Parses a short duration string like `24h`, `30m`, `90s`, `7d`, or `500ms` into milliseconds.
 *
 * The grammar is one or more digits followed by one lowercase unit (`ms`, `s`, `m`, `h`, `d`).
 * Anything else returns `null`, including a bare number, an unknown unit, an uppercase unit,
 * surrounding whitespace, a fractional value, and a result of zero.
 *
 * @param input - The duration string to parse.
 * @returns The duration in milliseconds, or `null` if `input` is not a well-formed positive duration.
 *
 * @example
 * ```ts
 * parseDuration('24h'); // 86400000
 * parseDuration('30m'); // 1800000
 * parseDuration('1.5h'); // null
 * parseDuration('foo'); // null
 * ```
 */
export function parseDuration(input: string): number | null {
    const match = DURATION_PATTERN.exec(input);
    if (!match) return null;

    const ms = Number(match[1]) * UNIT_MS[match[2] as DurationUnit];
    return ms > 0 ? ms : null;
}
