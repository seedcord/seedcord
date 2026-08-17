import { expectTypeOf } from 'vitest';

import type { ColorName } from '#src/Types/Colors';
import type { Colors } from 'discord.js';

// ColorName is a duplicated union (this package is djs-free at runtime), this pin catches a djs table change
expectTypeOf<ColorName>().toEqualTypeOf<keyof typeof Colors | 'Random'>();
