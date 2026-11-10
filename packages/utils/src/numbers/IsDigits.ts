type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';

export type IsDigits<TText extends string> = TText extends `${Digit}${infer Rest}`
    ? Rest extends ''
        ? true
        : IsDigits<Rest>
    : false;

// '000' strips down to '0'
export type StripZeros<TText extends string> = TText extends `0${infer Rest extends `${Digit}${string}`}`
    ? StripZeros<Rest>
    : TText;
