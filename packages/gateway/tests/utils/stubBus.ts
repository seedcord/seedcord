import { Bus } from '@seedcord/core';

import type { CoreBase } from '@seedcord/core';

export function stubBus(): Bus {
    // eslint-disable-next-line no-restricted-syntax -- fixture cast, the Bus only stores core and reads no member during publish
    return new Bus({} as unknown as CoreBase);
}
