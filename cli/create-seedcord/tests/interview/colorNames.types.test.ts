import { describe, expectTypeOf, it } from 'vitest';

import type { ColorChoice } from '#interview/steps/botColor';
import type { ColorName } from '@seedcord/types';

// the `satisfies ColorName[]` on the list already proves the other direction
describe('the color names the picker offers', () => {
    it('cover every ColorName, so none is unreachable in the picker', () => {
        expectTypeOf<ColorName>().toExtend<ColorChoice>();
    });
});
