import { Box, measureElement, useInput, useWindowSize } from 'ink';
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { useDevState } from '@ui/hooks/useDevState';
import { useLogs } from '@ui/hooks/useLogs';
import { useRailWidth } from '@ui/hooks/useRailWidth';
import { useScroll } from '@ui/hooks/useScroll';
import { useUptime } from '@ui/hooks/useUptime';
import { dispatchHotkey } from '@ui/hotkeys';
import { DevLayout } from '@ui/layout/DevLayout';
import { expandRows, rowKey } from '@ui/logRows';
import { LogStore } from '@ui/stores/LogStore';

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
    const [showToggles, setShowToggles] = useState(false);
    const [cursor, setCursor] = useState(0);

    const logBoxRef = useRef<DOMElement | null>(null);
    const [logBoxHeight, setLogBoxHeight] = useState(0);

    const railRef = useRef<DOMElement | null>(null);
    const railWidth = useRailWidth(railRef, state.phase, rows, columns);

    const logs = useLogs(enabled);
    const logRows = useMemo(() => expandRows(logs), [logs]);
    const viewportHeight = Math.max(1, logBoxHeight);
    const scroll = useScroll(logRows, viewportHeight, rowKey);
    const uptimeMs = useUptime(state);

    const interactive = !state.isBusy || state.restartRequired;

    // Re-measure only when something can change the box height, a terminal resize or a notification card
    // appearing/clearing. The measured height is the exact log-line budget for the scroll window.
    useLayoutEffect(() => {
        if (!logBoxRef.current) return;
        const measured = measureElement(logBoxRef.current).height;
        // eslint-disable-next-line @eslint-react/set-state-in-effect -- Ink layout is only measurable after render, so this sets the scroll-window height
        setLogBoxHeight((prev) => (prev === measured ? prev : measured));
    }, [rows, columns, state.error, state.restartRequired, state.commandUpdatePrompt]);

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
            showToggles,
            setShowToggles,
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
            <DevLayout
                state={state}
                railRef={railRef}
                railWidth={railWidth}
                logBoxRef={logBoxRef}
                scroll={scroll}
                viewportHeight={viewportHeight}
                measured={logBoxHeight > 0}
                enabled={enabled}
                showToggles={showToggles}
                cursor={cursor}
                interactive={interactive}
                uptimeMs={uptimeMs}
            />
        </Box>
    );
}
