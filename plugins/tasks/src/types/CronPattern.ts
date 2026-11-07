type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';

type IsDigits<Text extends string> = Text extends `${Digit}${infer Rest}`
    ? Rest extends ''
        ? true
        : IsDigits<Rest>
    : false;

type StripZeros<Text extends string> = Text extends `0${infer Rest extends `${Digit}${string}`}`
    ? StripZeros<Rest>
    : Text;

type ToNumber<Text extends string> =
    IsDigits<Text> extends true ? (StripZeros<Text> extends `${infer Value extends number}` ? Value : never) : never;

type CompareLength<Left extends string, Right extends string> = Left extends `${string}${infer LeftRest}`
    ? Right extends `${string}${infer RightRest}`
        ? CompareLength<LeftRest, RightRest>
        : 'gt'
    : Right extends ''
      ? 'eq'
      : 'lt';

type CompareDigits<Left extends string, Right extends string> = Left extends `${infer LeftHead}${infer LeftRest}`
    ? Right extends `${infer RightHead}${infer RightRest}`
        ? LeftHead extends RightHead
            ? CompareDigits<LeftRest, RightRest>
            : '0123456789' extends `${string}${LeftHead}${string}${RightHead}${string}`
              ? 'lt'
              : 'gt'
        : 'eq'
    : 'eq';

type LessOrEqual<Left extends number, Right extends number> =
    CompareLength<`${Left}`, `${Right}`> extends 'eq'
        ? CompareDigits<`${Left}`, `${Right}`> extends 'gt'
            ? false
            : true
        : CompareLength<`${Left}`, `${Right}`> extends 'lt'
          ? true
          : false;

interface Field {
    label: string;
    min: number;
    max: number;
    steps: number;
    names: Record<string, number>;
    hint: string;
}

interface Second extends Field {
    label: 'second';
    min: 0;
    max: 59;
    steps: 60;
    names: Record<never, number>;
    hint: '';
}

interface Minute extends Field {
    label: 'minute';
    min: 0;
    max: 59;
    steps: 60;
    names: Record<never, number>;
    hint: '';
}

interface Hour extends Field {
    label: 'hour';
    min: 0;
    max: 23;
    steps: 24;
    names: Record<never, number>;
    hint: '';
}

interface Day extends Field {
    label: 'day of month';
    min: 1;
    max: 31;
    steps: 31;
    names: Record<never, number>;
    hint: '';
}

interface Month extends Field {
    label: 'month';
    min: 1;
    max: 12;
    steps: 12;
    names: {
        jan: 1;
        feb: 2;
        mar: 3;
        apr: 4;
        may: 5;
        jun: 6;
        jul: 7;
        aug: 8;
        sep: 9;
        oct: 10;
        nov: 11;
        dec: 12;
    };
    hint: ' or jan-dec';
}

interface Weekday extends Field {
    label: 'day of week';
    min: 0;
    max: 7;
    steps: 7;
    names: { sun: 0; mon: 1; tue: 2; wed: 3; thu: 4; fri: 5; sat: 6 };
    hint: ' or sun-sat';
}

interface Year extends Field {
    label: 'year';
    min: 1;
    max: 9999;
    steps: 9999;
    names: Record<never, number>;
    hint: '';
}

interface Layouts {
    5: [Minute, Hour, Day, Month, Weekday];
    6: [Second, Minute, Hour, Day, Month, Weekday];
    7: [Second, Minute, Hour, Day, Month, Weekday, Year];
}

type CronNickname = '@yearly' | '@annually' | '@monthly' | '@weekly' | '@daily' | '@midnight' | '@hourly';

type Split<Text extends string, Separator extends string> = Text extends `${infer Head}${Separator}${infer Tail}`
    ? [Head, ...Split<Tail, Separator>]
    : [Text];

type Whitespace = ' ' | '\t' | '\n' | '\r';

// croner trims a pattern and splits it on runs of whitespace, so this does too
type Fields<
    Text extends string,
    Current extends string = '',
    Done extends string[] = []
> = Text extends `${infer Char}${infer Rest}`
    ? Char extends Whitespace
        ? Fields<Rest, '', Current extends '' ? Done : [...Done, Current]>
        : Fields<Rest, `${Current}${Char}`, Done>
    : Current extends ''
      ? Done
      : [...Done, Current];

type Fail<TField extends Field, Item extends string, Reason extends string> = `${TField['label']} '${Item}' ${Reason}`;

type ValueOf<TField extends Field, Text extends string> = Text extends keyof TField['names']
    ? TField['names'][Text]
    : ToNumber<Text>;

type InRange<Value extends number, Min extends number, Max extends number> = [Value] extends [never]
    ? false
    : LessOrEqual<Min, Value> extends true
      ? LessOrEqual<Value, Max>
      : false;

type CheckValue<TField extends Field, Text extends string, Item extends string> =
    InRange<ValueOf<TField, Text>, TField['min'], TField['max']> extends true
        ? true
        : Fail<TField, Item, `is outside ${TField['min']}-${TField['max']}${TField['hint']}`>;

type CheckStep<TField extends Field, Text extends string, Item extends string> =
    InRange<ToNumber<Text>, 1, TField['steps']> extends true
        ? true
        : Fail<TField, Item, `has a step outside 1-${TField['steps']}`>;

type RangeEnd<TField extends Field, Text extends string> = TField extends Weekday
    ? Text extends 'sun'
        ? '7'
        : Text
    : Text;

type CheckRange<TField extends Field, Start extends string, End extends string, Item extends string> =
    CheckValue<TField, Start, Item> extends string
        ? CheckValue<TField, Start, Item>
        : CheckValue<TField, RangeEnd<TField, End>, Item> extends string
          ? CheckValue<TField, RangeEnd<TField, End>, Item>
          : LessOrEqual<ValueOf<TField, Start>, ValueOf<TField, RangeEnd<TField, End>>> extends true
            ? true
            : Fail<TField, Item, 'runs backwards'>;

type CheckPlain<TField extends Field, Item extends string> = Item extends '*' | '?'
    ? true
    : Item extends `${'*' | '?'}/${infer Step}`
      ? CheckStep<TField, Step, Item>
      : Item extends `${infer Start}-${infer End}/${infer Step}`
        ? CheckRange<TField, Start, End, Item> extends true
            ? CheckStep<TField, Step, Item>
            : CheckRange<TField, Start, End, Item>
        : Item extends `${string}/${string}`
          ? Fail<TField, Item, 'steps from a number. Write */S or N-M/S'>
          : Item extends `${infer Start}-${infer End}`
            ? CheckRange<TField, Start, End, Item>
            : CheckValue<TField, Item, Item>;

type CheckWeekdays<
    TField extends Field,
    Value extends string,
    Item extends string
> = Value extends `${infer Start}-${infer End}`
    ? CheckRange<TField, Start, End, Item>
    : CheckValue<TField, Value, Item>;

type CheckItem<TField extends Field, Item extends string> = Item extends ''
    ? Fail<TField, Item, 'is empty. Put a value on both sides of each comma'>
    : TField extends Day
      ? Item extends 'l'
          ? true
          : Item extends `${infer Value}w`
            ? CheckValue<TField, Value, Item>
            : CheckPlain<TField, Item>
      : TField extends Weekday
        ? Item extends `${infer Value}#${infer Nth}`
            ? Nth extends '1' | '2' | '3' | '4' | '5' | 'l'
                ? CheckWeekdays<TField, Value, Item>
                : Fail<TField, Item, 'picks a week outside 1-5 or L'>
            : Item extends `${infer Value}l`
              ? CheckWeekdays<TField, Value, Item>
              : CheckPlain<TField, Item>
        : CheckPlain<TField, Item>;

type CheckItems<TField extends Field, Items extends string[]> = Items extends [
    infer Item extends string,
    ...infer Rest extends string[]
]
    ? CheckItem<TField, Item> extends true
        ? CheckItems<TField, Rest>
        : CheckItem<TField, Item>
    : true;

type CheckField<TField extends Field, Text extends string> = TField extends Day
    ? Text extends 'lw'
        ? true
        : CheckItems<TField, Split<Text, ','>>
    : CheckItems<TField, Split<TField extends Weekday ? (Text extends `+${infer Rest}` ? Rest : Text) : Text, ','>>;

type CheckFields<Texts extends string[], Fields extends Field[]> = Texts extends [
    infer Text extends string,
    ...infer RestTexts extends string[]
]
    ? Fields extends [infer TField extends Field, ...infer RestFields extends Field[]]
        ? CheckField<TField, Text> extends true
            ? CheckFields<RestTexts, RestFields>
            : CheckField<TField, Text>
        : true
    : true;

type CheckPattern<Texts extends string[]> = Texts['length'] extends keyof Layouts
    ? CheckFields<Texts, Layouts[Texts['length']]>
    : `has ${Texts['length']} field${Texts['length'] extends 1 ? '' : 's'}. Write 5 (minute first), 6 (second first) or 7 (second first, year last)`;

export type CronPattern<TPattern extends string> = string extends TPattern
    ? TPattern
    : Lowercase<TPattern> extends CronNickname
      ? TPattern
      : Lowercase<TPattern> extends `@${string}`
        ? `'${TPattern}' is not a nickname croner knows. Use @yearly, @annually, @monthly, @weekly, @daily, @midnight or @hourly`
        : CheckPattern<Fields<Lowercase<TPattern>>> extends infer Result
          ? Result extends string
              ? `Invalid cron pattern '${TPattern}': ${Result}`
              : TPattern
          : never;
