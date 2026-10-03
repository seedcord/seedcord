import { expectTypeOf } from 'vitest';

import type { Core } from '#src/interfaces/Core';
import type { Seedcord } from '#src/Seedcord';

// compile-only. tc is the assertion
expectTypeOf<Seedcord>().toExtend<Core>();
