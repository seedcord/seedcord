import React, { useCallback, useEffect, useRef } from 'react';

import { DevApp } from '#ui/DevApp';

import { createPreviewContext } from './PreviewContext';

import type { DevStore } from '#ui/stores/DevStore';
import type { Scenario } from './scenarios/types';
import type { ReactElement } from 'react';

interface PreviewHarnessProps {
    readonly store: DevStore;
    readonly scenario: Scenario;
}

// the scenario runs once in onReady, after the LogStore sink mounts. every UI control is a DevApp
// hotkey. this component only feeds scripted data.
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
