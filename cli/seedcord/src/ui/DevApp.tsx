import { Box, useInput, useWindowSize } from 'ink';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { Rule } from '#ui/components/primitives/Rule';
import { INITIAL_CURSOR } from '#ui/filterCursor';
import { useDevState } from '#ui/hooks/useDevState';
import { useFilters } from '#ui/hooks/useFilters';
import { useLogs } from '#ui/hooks/useLogs';
import { useMeasuredBox } from '#ui/hooks/useMeasuredBox';
import { usePanelFit } from '#ui/hooks/usePanelFit';
import { useRailWidth } from '#ui/hooks/useRailWidth';
import { useScroll } from '#ui/hooks/useScroll';
import { useUptime } from '#ui/hooks/useUptime';
import { acceptsSessionKeys, dispatchHotkey } from '#ui/hotkeys';
import { DevLayout } from '#ui/layout/DevLayout';
import { LogLayout } from '#ui/LogLayout';
import { expandRows, rowKey, wrapRows } from '#ui/logRows';
import { noticesOf } from '#ui/notices';
import { profileWrap } from '#ui/profile';
import { Screen } from '#ui/Screen';
import { LogStore } from '#ui/stores/LogStore';

import type { LogFilters } from '#ui/devPrefs';
import type { DevStore } from '#ui/stores/DevStore';
import type { DOMElement } from 'ink';
import type { ReactElement } from 'react';

interface DevAppProps {
    readonly store: DevStore;
    readonly onReady: () => void;
    readonly initialFilters: LogFilters;
    readonly onFiltersChange?: (filters: LogFilters) => void;
    readonly onQuit?: () => Promise<void> | void;
    readonly onDisconnect?: () => Promise<void> | void;
    readonly onRestart?: () => Promise<void> | void;
    readonly onRefreshCommands?: (shouldRefresh: boolean) => Promise<void> | void;
}

export function DevApp(props: DevAppProps): ReactElement {
    const { store, onReady, initialFilters, onFiltersChange } = props;
    const state = useDevState(store);
    const { rows, columns } = useWindowSize();

    const screen = Screen.fit(rows, columns);
    const { filters, setFilters, open, toggleOpen } = useFilters(initialFilters, screen.filters, onFiltersChange);
    const panelFit = usePanelFit();
    const [cursor, setCursor] = useState(INITIAL_CURSOR);

    const logBoxRef = useRef<DOMElement | null>(null);
    const logBox = useMeasuredBox(logBoxRef);

    const railRef = useRef<DOMElement | null>(null);
    const railWidth = useRailWidth(railRef, state.phase, rows, columns);

    const notices = noticesOf(state);

    const logs = useLogs(filters.channels, filters.levels);
    // getLongestLabel changes only when logs does
    const { logLayout, logRows } = useMemo(() => {
        const logLayout = LogLayout.fit(logBox.width, LogStore.instance.getLongestLabel());
        return { logLayout, logRows: profileWrap(() => wrapRows(expandRows(logs), logLayout)) };
    }, [logs, logBox.width]);
    const viewportHeight = Math.max(1, logBox.height);
    const scroll = useScroll(logRows, viewportHeight, rowKey);
    const uptimeMs = useUptime(state, screen.uptime);

    const interactive = acceptsSessionKeys(state);

    useInput((input, key) => {
        dispatchHotkey({
            input,
            key,
            state,
            interactive,
            scroll,
            store,
            filters,
            setFilters,
            filterView: screen.filterKeysView(open, panelFit.fits),
            toggleFilterView: toggleOpen,
            cursor,
            setCursor,
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
                screen={screen}
                notices={notices}
                railRef={railRef}
                railWidth={railWidth}
                logBoxRef={logBoxRef}
                scroll={scroll}
                logLayout={logLayout}
                viewportHeight={viewportHeight}
                measured={logBox.height > 0}
                filters={filters}
                filterView={screen.filterView(open)}
                panelFit={panelFit}
                cursor={cursor}
                interactive={interactive}
                uptimeMs={uptimeMs}
            />
        </Box>
    );
}
