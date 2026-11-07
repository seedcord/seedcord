import { expectTypeOf } from 'vitest';

import type { CronPattern } from '#src/types/CronPattern';
import type { acceptedPatterns, rejectedPatterns } from '#tests/fixtures/cronPatterns';

type Verdict<TPattern extends string> = TPattern extends string
    ? CronPattern<TPattern> extends TPattern
        ? 'accepts'
        : 'rejects'
    : never;

expectTypeOf<Verdict<(typeof acceptedPatterns)[number]>>().toEqualTypeOf<'accepts'>();
expectTypeOf<Verdict<(typeof rejectedPatterns)[number]>>().toEqualTypeOf<'rejects'>();
