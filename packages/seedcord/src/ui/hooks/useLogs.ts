import { useCallback, useMemo, useSyncExternalStore } from 'react';

import { LogStore } from '@ui/stores/LogStore';

import type { LogEntry } from '@ui/stores/LogStore';

// `enabled` must be a stable reference between unchanged renders (the shell holds it in state), or the memo
// recomputes every render. An empty/absent set means all channels.
export function useLogs(enabled?: ReadonlySet<string>): readonly LogEntry[] {
    const store = LogStore.instance;

    const subscribe = useCallback(
        (cb: () => void) => {
            store.on('change', cb);
            return () => {
                store.off('change', cb);
            };
        },
        [store]
    );

    const getSnapshot = useCallback(() => store.getLogs(), [store]);

    const allLogs = useSyncExternalStore(subscribe, getSnapshot);

    return useMemo(() => {
        if (!enabled || enabled.size === 0) return allLogs;
        return allLogs.filter((l) => enabled.has(l.channel));
    }, [allLogs, enabled]);
}
