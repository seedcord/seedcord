import { describe, expectTypeOf, it } from 'vitest';

import type { ColorName } from '@seedcord/types';
import type { ColorChoice } from '@src/interview/steps/botColor';

// the `satisfies ColorName[]` on the list already proves the other direction
describe('the color names the picker offers', () => {
    it('cover every ColorName, so none is unreachable in the picker', () => {
        expectTypeOf<ColorName>().toExtend<ColorChoice>();
    });
});
