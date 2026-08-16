import { useCallback, useMemo, useSyncExternalStore } from 'react';

import { LogStore } from '#ui/stores/LogStore';

import type { LogEntry } from '#ui/stores/LogStore';
import type { LogLevel } from '@seedcord/types';

const EMPTY_CHANNELS: ReadonlySet<string> = new Set();
const EMPTY_LEVELS: ReadonlySet<LogLevel> = new Set();

// empty set means all, so a channel or level that appears later stays visible by default
export function filterLogs(
    logs: readonly LogEntry[],
    channels: ReadonlySet<string>,
    levels: ReadonlySet<LogLevel>
): readonly LogEntry[] {
    const allChannels = channels.size === 0;
    const allLevels = levels.size === 0;
    if (allChannels && allLevels) return logs;
    return logs.filter((log) => (allChannels || channels.has(log.channel)) && (allLevels || levels.has(log.level)));
}

// `channels`/`levels` must be stable references between unchanged renders (the shell holds them in state), or
// the memo recomputes every render.
export function useLogs(channels?: ReadonlySet<string>, levels?: ReadonlySet<LogLevel>): readonly LogEntry[] {
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

    return useMemo(
        () => filterLogs(allLogs, channels ?? EMPTY_CHANNELS, levels ?? EMPTY_LEVELS),
        [allLogs, channels, levels]
    );
}
