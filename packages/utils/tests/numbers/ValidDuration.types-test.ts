import { expectTypeOf } from 'vite-plus/test';

import type { ValidDuration } from '#src/numbers/parseDuration';
import type { acceptedDurations, rejectedDurations } from '#tests/numbers/durations';

declare function every<const TText extends string>(duration: ValidDuration<TText>): void;
declare const typed: string;
declare const mixed: '5s' | '2w';

type Verdict<TText extends string> = TText extends string
    ? ValidDuration<TText> extends TText
        ? 'accepts'
        : 'rejects'
    : never;

expectTypeOf<Verdict<(typeof acceptedDurations)[number]>>().toEqualTypeOf<'accepts'>();
expectTypeOf<Verdict<(typeof rejectedDurations)[number]>>().toEqualTypeOf<'rejects'>();

every(typed);
// @ts-expect-error one member of the union has no unit
every(mixed);
