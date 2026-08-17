import { expectTypeOf } from 'vitest';

import type { ColorChoice } from '#interview/steps/botColor';
import type { ColorName } from '@seedcord/types';

// the `satisfies ColorName[]` on the list already proves the other direction
expectTypeOf<ColorName>().toExtend<ColorChoice>();
