import { useEffect, useEffectEvent } from 'react';

import { LogStore } from '#ui/stores/LogStore.ts';

export function useLogCapture(onReady: () => void): void {
    const ready = useEffectEvent(onReady);
    useEffect(() => {
        LogStore.instance.clear();
        LogStore.instance.mount();
        ready();
        return () => {
            LogStore.instance.unmount();
        };
    }, []);
}
