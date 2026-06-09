import { Box, measureElement, useInput, useWindowSize } from 'ink';
import React, { useEffect, useRef, useState } from 'react';

import { useDevState } from '@ui/hooks/useDevState';
import { useLogs } from '@ui/hooks/useLogs';
import { useScroll } from '@ui/hooks/useScroll';
import { useUptime } from '@ui/hooks/useUptime';
import { dispatchHotkey } from '@ui/hotkeys';
import { DevLayout } from '@ui/layout/DevLayout';
import { LogStore } from '@ui/stores/LogStore';

import type { DevStore } from '@ui/stores/DevStore';
import type { LogEntry } from '@ui/stores/LogStore';
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

function logKey(entry: LogEntry): number {
    return entry.id;
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
    const [railWidth, setRailWidth] = useState<number | null>(null);

    const logs = useLogs(enabled);
    const viewportHeight = Math.max(1, logBoxHeight);
    const scroll = useScroll(logs, viewportHeight, logKey);
    const uptimeMs = useUptime(state);

    const interactive = !state.isBusy || state.restartRequired;

    // Re-measure only when something can change the box height: a terminal resize, or a notification card
    // appearing/clearing. The measured height is the exact log-line budget for the scroll window.
    useEffect(() => {
        if (!logBoxRef.current) return;
        const measured = measureElement(logBoxRef.current).height;
        setLogBoxHeight((prev) => (prev === measured ? prev : measured));
    }, [rows, columns, state.error, state.restartRequired, state.commandUpdatePrompt]);

    // Measure the rail's natural content width once the config (its widest content) has loaded, then keep it
    // so the rail never reflows as logs stream.
    useEffect(() => {
        if (railWidth !== null || !railRef.current || !state.config) return;
        const measured = measureElement(railRef.current).width;
        if (measured > 0) setRailWidth(measured);
    }, [railWidth, rows, columns, state.config]);

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

    const isInitialized = useRef(false);
    useEffect(() => {
        if (isInitialized.current) return;
        isInitialized.current = true;

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
