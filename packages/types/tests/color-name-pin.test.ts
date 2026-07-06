import { describe, expectTypeOf, it } from 'vitest';

import type { ColorName } from '../src/Types/Colors';
import type { Colors } from 'discord.js';

describe('ColorName pin', () => {
    // ColorName is a duplicated union (this package is djs-free at runtime), this pin catches a djs table change
    it('equals the discord.js Colors keys plus Random', () => {
        expectTypeOf<ColorName>().toEqualTypeOf<keyof typeof Colors | 'Random'>();
    });
});
