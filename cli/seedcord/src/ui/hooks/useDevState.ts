import { useCallback, useSyncExternalStore } from 'react';

import type { DevState, DevStore } from '#ui/stores/DevStore';

export function useDevState(store: DevStore): DevState {
    const subscribe = useCallback(
        (onChange: () => void) => {
            store.on('change', onChange);
            return () => {
                store.off('change', onChange);
            };
        },
        [store]
    );
    const getSnapshot = useCallback(() => store.getState(), [store]);
    return useSyncExternalStore(subscribe, getSnapshot);
}
