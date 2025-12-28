import { Box, useInput, useStdout } from 'ink';
import React, { useEffect, useState } from 'react';

import { Banner, ChannelSelector, ErrorDisplay, Help, LogPanel, StatusLine } from '@ui/components';
import { LogStore } from '@ui/stores/LogStore';

import type { ReactElement } from 'react';

interface DevAppActions {
    setStatus: (status: string) => void;
    setError: (error: Error) => void;
    setBusy: (isBusy: boolean) => void;
}

interface DevAppProps {
    readonly onReady: (actions: DevAppActions) => void;
    readonly preventCtrlC?: boolean;
    readonly logHeight?: number;
    readonly onQuit?: () => Promise<void> | void;
    readonly onDisconnect?: () => Promise<void> | void;
    readonly onRestart?: () => Promise<void> | void;
}

export function DevApp({ onReady, onQuit, onDisconnect, onRestart, logHeight = 30 }: DevAppProps): ReactElement {
    const [status, setStatus] = useState('Initializing...');
    const [error, setError] = useState<Error | null>(null);
    const [isBusy, setBusy] = useState(true);
    const [showHelp, setShowHelp] = useState(false);
    const [showChannels, setShowChannels] = useState(false);
    const [selectedChannel, setSelectedChannel] = useState<string | undefined>('default');

    const { stdout } = useStdout();
    const DEFAULT_ROWS = 24;
    const [terminalHeight, setTerminalHeight] = useState(stdout.rows || DEFAULT_ROWS);
    const [resizeKey, setResizeKey] = useState(0);

    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!stdout) return;

        const onResize = (): void => {
            setTerminalHeight(stdout.rows);
            setResizeKey((prev) => prev + 1);
        };

        stdout.on('resize', onResize);
        return () => {
            stdout.off('resize', onResize);
        };
    }, [stdout]);

    const staticHeight = 10;
    const effectiveLogHeight = Math.min(logHeight, Math.max(5, terminalHeight - staticHeight));

    useInput((input) => {
        if (showChannels) return; // ChannelSelector will handle input

        if (input === 'q') {
            setStatus('Quitting...');
            void onQuit?.();
        }

        if (isBusy) return;

        if (input === 'd') {
            setBusy(true);
            void onDisconnect?.();
        }

        if (input === 'r') {
            setBusy(true);
            setStatus('Restarting...');
            void onRestart?.();
        }

        if (input === 'c') {
            setShowChannels(true);
        }

        if (input === 'h') {
            setShowHelp((prev) => !prev);
        }
    });

    useEffect(() => {
        LogStore.instance.clear();
        LogStore.instance.mount();
        onReady({ setStatus, setError, setBusy });

        return () => {
            LogStore.instance.unmount();
        };
    }, [onReady]);

    return (
        <Box flexDirection="column" key={resizeKey}>
            <Banner />
            {error && <ErrorDisplay error={error} />}
            {showHelp && <Help />}
            <StatusLine text={status} spinner={isBusy} />
            {showChannels ? (
                <ChannelSelector
                    currentChannel={selectedChannel}
                    onSelect={setSelectedChannel}
                    onClose={() => setShowChannels(false)}
                />
            ) : (
                effectiveLogHeight > 0 && <LogPanel height={effectiveLogHeight} channel={selectedChannel} />
            )}
        </Box>
    );
}
