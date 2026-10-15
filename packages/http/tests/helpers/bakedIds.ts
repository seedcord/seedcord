import { BAKED_IDS_KEY } from '@seedcord/core/internal';

import type { BakedIds } from '@seedcord/core/internal';

// fills the slot the way seedcord build's worker entry does
export function registerBakedIds(ids: Pick<BakedIds, 'publicKey'> & Partial<BakedIds>): Disposable {
    Reflect.set(globalThis, Symbol.for(BAKED_IDS_KEY), {
        emojis: {},
        commands: {},
        contextMenus: { user: {}, message: {} },
        ...ids
    } satisfies BakedIds);
    return { [Symbol.dispose]: clearBakedIds };
}

export function clearBakedIds(): void {
    Reflect.deleteProperty(globalThis, Symbol.for(BAKED_IDS_KEY));
}
