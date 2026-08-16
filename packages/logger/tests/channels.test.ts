import { describe, expectTypeOf, it } from 'vitest';

import type { FRAMEWORK_CHANNELS } from '#src/channels';
import type { FrameworkChannel } from '@seedcord/types';

describe('FRAMEWORK_CHANNELS', () => {
    it('covers the union both directions', () => {
        expectTypeOf<(typeof FRAMEWORK_CHANNELS)[number]>().toEqualTypeOf<FrameworkChannel>();
    });
});
