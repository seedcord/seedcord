import { Box, useBoxMetrics, useInput, useWindowSize } from 'ink';
import React, { useRef, useState } from 'react';

import { Rule } from '#ui/components/primitives/Rule';
import { INITIAL_CURSOR } from '#ui/filterCursor';
import { useDevState } from '#ui/hooks/useDevState';
import { useFilterPanel } from '#ui/hooks/useFilterPanel';
import { useLogCapture } from '#ui/hooks/useLogCapture';
import { useLogRows } from '#ui/hooks/useLogRows';
import { useLogs } from '#ui/hooks/useLogs';
import { usePanelFit } from '#ui/hooks/usePanelFit';
import { usePrefs } from '#ui/hooks/usePrefs';
import { useRailWidth } from '#ui/hooks/useRailWidth';
import { useScroll } from '#ui/hooks/useScroll';
import { useUptime } from '#ui/hooks/useUptime';
import { acceptsSessionKeys, dispatchHotkey } from '#ui/hotkeys';
import { DevLayout } from '#ui/layout/DevLayout';
import { rowKey } from '#ui/logRows';
import { noticesOf } from '#ui/notices';
import { Screen } from '#ui/Screen';

import type { DevPrefs } from '#ui/devPrefs';
import type { DevStore } from '#ui/stores/DevStore';
import type { DOMElement } from 'ink';
import type { ReactElement } from 'react';

interface DevAppProps {
    readonly store: DevStore;
    readonly onReady: () => void;
    readonly initialPrefs: DevPrefs;
    readonly onPrefsChange?: (prefs: DevPrefs) => void;
    readonly onQuit?: () => Promise<void> | void;
    readonly onDisconnect?: () => Promise<void> | void;
    readonly onRestart?: () => Promise<void> | void;
    readonly onCodegen?: () => void;
    readonly onRefreshCommands?: (shouldRefresh: boolean) => Promise<void> | void;
}

export function DevApp(props: DevAppProps): ReactElement {
    const { store, onReady } = props;
    const state = useDevState(store);
    const { rows, columns } = useWindowSize();

    const { filters, details, railHidden, setFilters, toggleRail, cycleDetails } = usePrefs(
        props.initialPrefs,
        props.onPrefsChange
    );
    const screen = Screen.fit(rows, columns, railHidden);
    const { open, toggleOpen } = useFilterPanel(screen.filters);
    const panelFit = usePanelFit();
    const [cursor, setCursor] = useState(INITIAL_CURSOR);

    const logBoxRef = useRef<DOMElement | null>(null);
    const logBox = useBoxMetrics(logBoxRef);

    const railRef = useRef<DOMElement | null>(null);
    const railWidth = useRailWidth(railRef, state.phase);

    const notices = noticesOf(state);

    const logs = useLogs(filters.channels, filters.levels);
    const { logLayout, logRows } = useLogRows(logs, logBox.width, details);
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
            canToggleRail: screen.canToggleRail,
            toggleRail,
            cycleDetails,
            cursor,
            setCursor,
            onQuit: props.onQuit,
            onDisconnect: props.onDisconnect,
            onRestart: props.onRestart,
            onCodegen: props.onCodegen,
            onRefreshCommands: props.onRefreshCommands
        });
    });

    useLogCapture(onReady);

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
                measured={logBox.hasMeasured}
                filters={filters}
                filterView={screen.filterView(open)}
                panelFit={panelFit}
                cursor={cursor}
                interactive={interactive}
                uptimeMs={uptimeMs}
                details={details}
            />
        </Box>
    );
}
