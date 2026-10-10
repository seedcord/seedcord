import { BAKED_IDS_KEY } from '@seedcord/core/internal';

import type { BakedIds } from '@seedcord/core/internal';

// writes the object seedcord build writes onto the slot
export function registerBakedIds(ids: Pick<BakedIds, 'publicKey'> & Partial<BakedIds>): void {
    Reflect.set(globalThis, Symbol.for(BAKED_IDS_KEY), {
        emojis: {},
        commands: {},
        contextMenus: { user: {}, message: {} },
        ...ids
    } satisfies BakedIds);
}

export function clearBakedIds(): void {
    Reflect.deleteProperty(globalThis, Symbol.for(BAKED_IDS_KEY));
}
