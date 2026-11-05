import { useMemo } from 'react';

import { LogLayout } from '#ui/LogLayout.ts';
import { expandRows, wrapRows } from '#ui/logRows.ts';
import { profileWrap } from '#ui/profile.ts';
import { LogStore } from '#ui/stores/LogStore.ts';

import type { DetailMode } from '#ui/LogLayout.ts';
import type { LogRow } from '#ui/logRows.ts';
import type { LogEntry } from '#ui/stores/LogStore.ts';

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
