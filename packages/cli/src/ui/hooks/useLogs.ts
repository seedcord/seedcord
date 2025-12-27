import { useCallback, useMemo, useSyncExternalStore } from 'react';

import { LogStore } from '../stores/LogStore';

import type { LogEntry } from '../stores/LogStore';

export function useLogs(channel?: string): readonly LogEntry[] {
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
        if (!channel) return allLogs;
        return allLogs.filter((l) => l.channel === channel);
    }, [allLogs, channel]);
}
