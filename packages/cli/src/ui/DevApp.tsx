import React, { useEffect, useState } from 'react';

import { Banner, LogPanel, StatusLine } from '@ui/components';
import { LogStore } from '@ui/stores/LogStore';

import type { ReactElement } from 'react';

interface DevAppProps {
    readonly onReady: (setStatus: (status: string) => void) => void;
}

export function DevApp({ onReady }: DevAppProps): ReactElement {
    const [status, setStatus] = useState('Initializing...');

    useEffect(() => {
        LogStore.instance.clear();
        LogStore.instance.mount();
        onReady(setStatus);

        return () => {
            LogStore.instance.unmount();
        };
    }, [onReady]);

    return (
        <>
            <Banner />
            <StatusLine text={status} spinner={false} />
            <LogPanel height={30} />
        </>
    );
}
