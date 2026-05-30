import { Box, measureElement, Text, useInput, useStdout } from 'ink';
import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import {
    Banner,
    ChannelSelector,
    CommandRefreshPrompt,
    ErrorDisplay,
    Footer,
    LogPanel,
    StatusBadge
} from '@ui/components';
import { isSessionLive } from '@ui/stores/devPhase';
import { LogStore } from '@ui/stores/LogStore';

import type { FooterMode } from '@ui/components';
import type { DevState, DevStore } from '@ui/stores/DevStore';
import type { DOMElement } from 'ink';
import type { ReactElement } from 'react';

function useDevState(store: DevStore): DevState {
    const subscribe = useCallback(
        (onChange: () => void) => {
            store.on('change', onChange);
            return () => {
                store.off('change', onChange);
            };
        },
        [store]
    );
    const getSnapshot = useCallback(() => store.getState(), [store]);
    return useSyncExternalStore(subscribe, getSnapshot);
}

interface DevAppProps {
    readonly store: DevStore;
    readonly onReady: () => void;
    readonly onQuit?: () => Promise<void> | void;
    readonly onDisconnect?: () => Promise<void> | void;
    readonly onRestart?: () => Promise<void> | void;
    readonly onRefreshCommands?: (shouldRefresh: boolean) => Promise<void> | void;
}

const MIN_LOG_LINES = 3;
const BORDER_ROWS = 2;

// eslint-disable-next-line max-lines-per-function -- single root component; splitting the layout tree adds indirection without reducing complexity
export function DevApp({
    store,
    onReady,
    onQuit,
    onDisconnect,
    onRestart,
    onRefreshCommands
}: DevAppProps): ReactElement {
    const { phase, status, error, isBusy, config, restartRequired, commandUpdatePrompt } = useDevState(store);

    const [showChannels, setShowChannels] = useState(false);
    const [selectedChannel, setSelectedChannel] = useState<string | undefined>(undefined);

    const { stdout } = useStdout();
    const DEFAULT_ROWS = 24;
    const DEFAULT_COLUMNS = 80;
    const [terminalHeight, setTerminalHeight] = useState(stdout.rows || DEFAULT_ROWS);
    const [terminalWidth, setTerminalWidth] = useState(stdout.columns || DEFAULT_COLUMNS);
    const isInitialized = useRef(false);

    // The log slot flexes to fill whatever the header (banner + badge), an error/prompt above it, and the
    // footer leave behind; measureElement reads that laid-out height so the log tail slices to exactly fit.
    // Everything renders inside the bounded column so it can never grow past terminalHeight (Ink corrupts
    // frames when it does), and the error sits above the logs rather than replacing them.
    const logSlotRef = useRef<DOMElement | null>(null);
    const [logSlotHeight, setLogSlotHeight] = useState(0);

    useEffect(() => {
        // useStdout() types stdout as always present, but it is undefined when stdout is not a TTY.
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- see above
        if (!stdout) return;

        const onResize = (): void => {
            setTerminalHeight(stdout.rows);
            setTerminalWidth(stdout.columns);
        };

        stdout.on('resize', onResize);
        return () => {
            stdout.off('resize', onResize);
        };
    }, [stdout]);

    useEffect(() => {
        if (logSlotRef.current) {
            setLogSlotHeight(measureElement(logSlotRef.current).height);
        }
        // Anything that shrinks the log slot (terminal size, banner growth on config load, an error or
        // prompt above it) must trigger a re-measure so the tail re-slices to the new height.
    }, [terminalHeight, terminalWidth, config, error, commandUpdatePrompt, showChannels]);

    const logLines = Math.max(0, logSlotHeight - BORDER_ROWS);
    const interactive = !isBusy || restartRequired;
    const footerMode: FooterMode = commandUpdatePrompt ? 'prompt' : showChannels ? 'channels' : 'default';

    useInput(
        // eslint-disable-next-line max-statements, complexity -- flat keypress dispatch; each branch is one hotkey, splitting it would only hide the dispatch table
        (input, key) => {
            // Ink puts stdin in raw mode, so Ctrl-C arrives as a keypress, not a SIGINT the process handler
            // could catch. Treat it as quit here so it always works regardless of the current state.
            if (key.ctrl && input === 'c') {
                store.beginQuit();
                void onQuit?.();
                return;
            }

            if (commandUpdatePrompt) {
                if (input === 'y') {
                    void onRefreshCommands?.(true);
                    store.clearPrompt();
                } else if (input === 'n') {
                    void onRefreshCommands?.(false);
                    store.clearPrompt();
                }
                return;
            }

            if (showChannels) return; // ChannelSelector will handle input

            if (input === 'q') {
                store.beginQuit();
                void onQuit?.();
                return;
            }

            if (!interactive) return;

            if (input === 'd') {
                if (!isSessionLive(phase)) return; // nothing to disconnect when already stopped
                store.beginDisconnect();
                void onDisconnect?.();
                return;
            }

            if (input === 'r') {
                store.beginRestart();
                void onRestart?.();
                return;
            }

            if (input === 'c' && !key.ctrl) {
                setShowChannels(true);
                return;
            }

            if (input === 'l') {
                LogStore.instance.clear(selectedChannel);
            }
        }
    );

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
        <Box flexDirection="column" width={terminalWidth} height={terminalHeight} overflow="hidden">
            <Banner config={config} />
            <StatusBadge phase={phase} detail={status} />
            <Box flexGrow={1} flexDirection="column" overflow="hidden">
                {commandUpdatePrompt && <CommandRefreshPrompt files={commandUpdatePrompt} />}
                {error && <ErrorDisplay error={error} />}
                {showChannels ? (
                    <ChannelSelector
                        currentChannel={selectedChannel}
                        onSelect={setSelectedChannel}
                        onClose={() => setShowChannels(false)}
                    />
                ) : (
                    <Box ref={logSlotRef} flexGrow={1} flexDirection="column" overflow="hidden">
                        {logSlotHeight === 0 ? null : logLines >= MIN_LOG_LINES ? (
                            <LogPanel height={logLines} channel={selectedChannel} />
                        ) : (
                            <Text color="yellow" wrap="truncate">
                                Terminal too small to show logs.
                            </Text>
                        )}
                    </Box>
                )}
            </Box>
            <Footer phase={phase} interactive={interactive} mode={footerMode} />
        </Box>
    );
}
