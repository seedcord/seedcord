import { useEffect, useRef } from 'react';

import { LogStore } from '#ui/stores/LogStore';

// routes every log into LogStore for the life of the dev UI, then calls onReady once
export function useLogCapture(onReady: () => void): void {
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
}
