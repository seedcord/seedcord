import { Box, useInput, useWindowSize } from 'ink';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { Rule } from '@ui/components/primitives/Rule';
import { INITIAL_CURSOR } from '@ui/filterCursor';
import { useDevState } from '@ui/hooks/useDevState';
import { useLogs } from '@ui/hooks/useLogs';
import { useMeasuredBox } from '@ui/hooks/useMeasuredBox';
import { useRailWidth } from '@ui/hooks/useRailWidth';
import { useScroll } from '@ui/hooks/useScroll';
import { useUptime } from '@ui/hooks/useUptime';
import { dispatchHotkey } from '@ui/hotkeys';
import { DevLayout } from '@ui/layout/DevLayout';
import { expandRows, rowKey, wrapRows } from '@ui/logRows';
import { noticesOf } from '@ui/notices';
import { LogStore } from '@ui/stores/LogStore';
import { tierFor } from '@ui/tier';

import type { LogLevel } from '@seedcord/logger';
import type { DevStore } from '@ui/stores/DevStore';
import type { DOMElement } from 'ink';
import type { ReactElement } from 'react';

interface DevAppProps {
    readonly store: DevStore;
    readonly onReady: () => void;
    readonly onQuit?: () => Promise<void> | void;
    readonly onDisconnect?: () => Promise<void> | void;
    readonly onRestart?: () => Promise<void> | void;
    readonly onRefreshCommands?: (shouldRefresh: boolean) => Promise<void> | void;
}

export function DevApp(props: DevAppProps): ReactElement {
    const { store, onReady } = props;
    const state = useDevState(store);
    const { rows, columns } = useWindowSize();

    const [enabled, setEnabled] = useState<ReadonlySet<string>>(() => new Set());
    const [enabledLevels, setEnabledLevels] = useState<ReadonlySet<LogLevel>>(() => new Set());
    const [cursor, setCursor] = useState(INITIAL_CURSOR);

    const logBoxRef = useRef<DOMElement | null>(null);
    const logBox = useMeasuredBox(logBoxRef);

    const railRef = useRef<DOMElement | null>(null);
    const railWidth = useRailWidth(railRef, state.phase, rows, columns);

    const tier = tierFor(rows, columns);
    const notices = noticesOf(state);

    const logs = useLogs(enabled, enabledLevels);
    // the label width only grows with a new entry, so the logs dep already covers it
    const logRows = useMemo(
        () => wrapRows(expandRows(logs), logBox.width, Math.max(1, LogStore.instance.getLabelWidth())),
        [logs, logBox.width]
    );
    const viewportHeight = Math.max(1, logBox.height);
    const scroll = useScroll(logRows, viewportHeight, rowKey);
    const uptimeMs = useUptime(state);

    const interactive = !state.isBusy || state.restartRequired;

    useInput((input, key) => {
        dispatchHotkey({
            input,
            key,
            state,
            interactive,
            scroll,
            store,
            enabled,
            setEnabled,
            enabledLevels,
            setEnabledLevels,
            cursor,
            setCursor,
            filtersOpen: tier === 'full',
            onQuit: props.onQuit,
            onDisconnect: props.onDisconnect,
            onRestart: props.onRestart,
            onRefreshCommands: props.onRefreshCommands
        });
    });

    const isInitializedRef = useRef(false);
    useEffect(() => {
        if (isInitializedRef.current) return;
        isInitializedRef.current = true;

        LogStore.instance.clear();
        LogStore.instance.mount();
        onReady();

        return () => {
            LogStore.instance.unmount();
        };
    }, [onReady]);

    return (
        <Box flexDirection="column" width={columns} height={rows} overflow="hidden">
            {/* need the rule for some padding at the top */}
            <Rule />
            <DevLayout
                state={state}
                tier={tier}
                notices={notices}
                railRef={railRef}
                railWidth={railWidth}
                logBoxRef={logBoxRef}
                scroll={scroll}
                viewportHeight={viewportHeight}
                measured={logBox.height > 0}
                columns={columns}
                enabled={enabled}
                enabledLevels={enabledLevels}
                cursor={cursor}
                interactive={interactive}
                uptimeMs={uptimeMs}
            />
        </Box>
    );
}
