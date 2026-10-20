import { useSyncExternalStore } from 'react';

import type { DevState, DevStore } from '#ui/stores/DevStore';

export function useDevState(store: DevStore): DevState {
    return useSyncExternalStore(store.subscribe, () => store.getState());
}
