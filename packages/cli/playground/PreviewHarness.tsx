import React, { useCallback, useEffect, useRef } from 'react';

import { DevApp } from '@ui/DevApp';

import { createPreviewContext } from './PreviewContext';

import type { Scenario } from './scenarios/types';
import type { DevStore } from '@ui/stores/DevStore';
import type { ReactElement } from 'react';

interface PreviewHarnessProps {
    readonly store: DevStore;
    readonly scenario: Scenario;
}

// Dev-only harness: it renders the real DevApp and runs the scenario once (in onReady, after the LogStore
// sink mounts). All UI controls are the real DevApp hotkeys; the harness only feeds scripted data.
export function PreviewHarness({ store, scenario }: PreviewHarnessProps): ReactElement {
    const abortRef = useRef({ aborted: false });

    useEffect(() => {
        const abort = abortRef.current;
        return () => {
            abort.aborted = true;
        };
    }, []);

    const handleReady = useCallback(() => {
        const ctx = createPreviewContext(store, abortRef.current);
        void scenario.run(ctx);
    }, [store, scenario]);

    return (
        <DevApp
            store={store}
            onReady={handleReady}
            onQuit={() => process.exit(0)}
            onDisconnect={() => {
                // Mirror DevRunner.handleDisconnected so the offline state is interactive (r can restart).
                store.setPhase('disconnected');
                store.setStatus('Disconnected. Press r to restart.');
                store.setBusy(false);
            }}
            onRestart={() => {
                store.setError(null);
                store.setPhase('running');
                store.setBusy(false);
                store.setStatus('Restarted.');
            }}
        />
    );
}
