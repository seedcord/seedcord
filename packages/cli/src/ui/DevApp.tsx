import { Box, Text, useInput, useStdout } from 'ink';
import React, { useEffect, useState } from 'react';

import {
    Banner,
    ChannelSelector,
    CommandRefreshPrompt,
    ErrorDisplay,
    Help,
    HELP_HEIGHT,
    LogPanel,
    StatusLine
} from '@ui/components';
import { LogStore } from '@ui/stores/LogStore';

import type { Config } from '@seedcord/types';
import type { ReactElement } from 'react';

interface DevAppActions {
    setStatus: (status: string) => void;
    setError: (error: Error) => void;
    setBusy: (isBusy: boolean) => void;
    setConfig: (config: Config) => void;
    setRestartRequired: (required: boolean) => void;
    setCommandUpdatePrompt: (files: string[] | null) => void;
}

interface DevAppProps {
    readonly onReady: (actions: DevAppActions) => void;
    readonly preventCtrlC?: boolean;
    readonly onQuit?: () => Promise<void> | void;
    readonly onDisconnect?: () => Promise<void> | void;
    readonly onRestart?: () => Promise<void> | void;
    readonly onRefreshCommands?: (shouldRefresh: boolean) => Promise<void> | void;
}

// eslint-disable-next-line max-lines-per-function
export function DevApp({ onReady, onQuit, onDisconnect, onRestart, onRefreshCommands }: DevAppProps): ReactElement {
    const [status, setStatus] = useState('Initializing...');
    const [error, setError] = useState<Error | null>(null);
    const [isBusy, setBusy] = useState(true);
    const [config, setConfig] = useState<Config | null>(null);
    const [showHelp, setShowHelp] = useState(false);
    const [showChannels, setShowChannels] = useState(false);
    const [selectedChannel, setSelectedChannel] = useState<string | undefined>('default');
    const [restartRequired, setRestartRequired] = useState(false);
    const [commandUpdatePrompt, setCommandUpdatePrompt] = useState<string[] | null>(null);

    const { stdout } = useStdout();
    const DEFAULT_ROWS = 24;
    const DEFAULT_COLUMNS = 80;
    const [terminalHeight, setTerminalHeight] = useState(stdout.rows || DEFAULT_ROWS);
    const [terminalWidth, setTerminalWidth] = useState(stdout.columns || DEFAULT_COLUMNS);
    const [resizeKey, setResizeKey] = useState(0);

    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!stdout) return;

        const onResize = (): void => {
            setTerminalHeight(stdout.rows);
            setTerminalWidth(stdout.columns);
            setResizeKey((prev) => prev + 1);
        };

        stdout.on('resize', onResize);
        return () => {
            stdout.off('resize', onResize);
        };
    }, [stdout]);

    const staticOverhead = 13;

    const helpOverhead = showHelp ? HELP_HEIGHT : 0;
    const errorOverhead = error ? (error.stack?.split('\n').length ?? 0) + 5 : 0;
    // eslint-disable-next-line no-magic-numbers
    const promptOverhead = commandUpdatePrompt ? commandUpdatePrompt.length + 4 : 0;
    const availableHeight = terminalHeight - staticOverhead - helpOverhead - errorOverhead - promptOverhead;
    const effectiveLogHeight = Math.max(0, availableHeight);

    useInput(
        // eslint-disable-next-line max-statements, complexity
        (input) => {
            if (commandUpdatePrompt) {
                if (input === 'y') {
                    void onRefreshCommands?.(true);
                    setCommandUpdatePrompt(null);
                } else if (input === 'n') {
                    void onRefreshCommands?.(false);
                    setCommandUpdatePrompt(null);
                }
                return;
            }

            if (showChannels) return; // ChannelSelector will handle input

            if (input === 'q') {
                setStatus('Quitting...');
                void onQuit?.();
                return;
            }

            if (isBusy && !restartRequired) return;

            if (input === 'd') {
                setBusy(true);
                setRestartRequired(false);

                if (error) setError(null);
                setStatus('Disconnecting...');
                void onDisconnect?.();
                return;
            }

            if (input === 'r') {
                setBusy(true);
                setRestartRequired(false);
                setStatus('Restarting...');
                if (error) setError(null);
                void onRestart?.();
                return;
            }

            if (input === 'c') {
                setShowChannels(true);
                return;
            }

            if (input === 'h') {
                setShowHelp((prev) => !prev);
                return;
            }

            if (input === 'l') {
                LogStore.instance.clear(selectedChannel);
            }
        }
    );

    useEffect(() => {
        LogStore.instance.clear();
        LogStore.instance.mount();
        onReady({ setStatus, setError, setBusy, setConfig, setRestartRequired, setCommandUpdatePrompt });

        return () => {
            LogStore.instance.unmount();
        };
    }, [onReady]);

    return (
        <Box flexDirection="column" key={resizeKey} width={terminalWidth} height={terminalHeight}>
            <Banner config={config} />
            {error && <ErrorDisplay error={error} />}
            {commandUpdatePrompt && <CommandRefreshPrompt files={commandUpdatePrompt} />}
            {showHelp && <Help />}
            <StatusLine text={status} spinner={isBusy} restartRequired={restartRequired} />
            {showChannels ? (
                <ChannelSelector
                    currentChannel={selectedChannel}
                    onSelect={setSelectedChannel}
                    onClose={() => setShowChannels(false)}
                />
            ) : effectiveLogHeight >= 5 ? (
                <LogPanel height={effectiveLogHeight} channel={selectedChannel} />
            ) : (
                <Box borderStyle="round" borderColor="yellow" flexDirection="column" padding={1}>
                    <Text color="yellow">Terminal too small to show logs.</Text>
                    <Text dimColor>Please increase terminal height.</Text>
                </Box>
            )}
        </Box>
    );
}
