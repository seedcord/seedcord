import type { IsDigits, StripZeros } from './CronPattern';

type Amount<Text extends string> = Text extends `${infer Value}ms`
    ? Value
    : Text extends `${infer Value}s`
      ? Value
      : Text extends `${infer Value}m`
        ? Value
        : Text extends `${infer Value}h`
          ? Value
          : Text extends `${infer Value}d`
            ? Value
            : never;

type IsWholeAmount<Value extends string> =
    IsDigits<Value> extends true ? (StripZeros<Value> extends '0' ? false : true) : false;

export type Duration<TText extends string> = string extends TText
    ? TText
    : IsWholeAmount<Amount<TText>> extends true
      ? TText
      : `'${TText}' isn't a duration. Write a whole number above 0 and a unit (ms, s, m, h or d), like '90s' or '2h'`;
