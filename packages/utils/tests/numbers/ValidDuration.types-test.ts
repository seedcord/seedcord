import type { ValidDuration } from '#src/numbers/parseDuration';

declare function every<const TText extends string>(duration: ValidDuration<TText>): void;
declare const typed: string;

every('500ms');
every('90s');
every('30m');
every('24h');
every('7d');
every('05s');
every(typed);

// @ts-expect-error zero isn't a duration
every('0s');
// @ts-expect-error zero isn't a duration, however many digits
every('00ms');
// @ts-expect-error a fraction isn't a duration
every('1.5h');
// @ts-expect-error a negative number isn't a duration
every('-5m');
// @ts-expect-error a duration needs a unit
every('30');
// @ts-expect-error a duration needs a number
every('ms');
// @ts-expect-error units are lowercase
every('30M');
// @ts-expect-error weeks aren't a unit
every('2w');
