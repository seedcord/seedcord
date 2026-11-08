import { useMemo } from 'react';

import { LogLayout } from '#ui/LogLayout';
import { expandRows, wrapRows } from '#ui/logRows';
import { profileWrap } from '#ui/profile';
import { LogStore } from '#ui/stores/LogStore';

import type { DetailMode } from '#ui/LogLayout';
import type { LogRow } from '#ui/logRows';
import type { LogEntry } from '#ui/stores/LogStore';

interface LogRows {
    readonly logLayout: LogLayout;
    readonly logRows: readonly LogRow[];
}

export function useLogRows(logs: readonly LogEntry[], width: number, details: DetailMode): LogRows {
    // getLongestLabel reads the same entries as logs
    return useMemo(() => {
        const logLayout = LogLayout.fit(width, LogStore.instance.getLongestLabel(), details);
        return { logLayout, logRows: profileWrap(() => wrapRows(expandRows(logs), logLayout)) };
    }, [logs, width, details]);
}
