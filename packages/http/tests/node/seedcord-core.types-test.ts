import { expectTypeOf } from 'vite-plus/test';

import type { Core } from '#src/interfaces/Core';
import type { Seedcord } from '#src/node/Seedcord';

// compile-only. tc is the assertion
expectTypeOf<Seedcord>().toExtend<Core>();
