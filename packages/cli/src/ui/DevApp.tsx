import { useInput } from 'ink';
import React, { useEffect, useState } from 'react';

import { Banner, ErrorDisplay, Help, LogPanel, StatusLine } from '@ui/components';
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

    useInput((input) => {
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
            setStatus('Channels option pressed (Not implemented yet)');
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
        <>
            <Banner />
            {error && <ErrorDisplay error={error} />}
            {showHelp && <Help />}
            <StatusLine text={status} spinner={isBusy} />
            <LogPanel height={logHeight} />
        </>
    );
}
