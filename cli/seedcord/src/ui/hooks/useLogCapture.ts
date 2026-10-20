import { useEffect, useRef } from 'react';

import { LogStore } from '#ui/stores/LogStore';

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
