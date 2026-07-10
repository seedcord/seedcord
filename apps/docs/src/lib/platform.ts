'use client';

import { useSyncExternalStore } from 'react';

// navigator.platform is deprecated but is still the most reliable mac signal
export function isMacPlatform(nav: { platform?: string; userAgent?: string }): boolean {
    return /Mac|iPhone|iPad|iPod/i.test(nav.platform || nav.userAgent || '');
}

const subscribe = (): (() => void) => () => {};
const readIsMac = (): boolean => isMacPlatform(navigator);
// false on the server so the first client paint matches SSR.
const readServer = (): boolean => false;

export function useIsMac(): boolean {
    return useSyncExternalStore(subscribe, readIsMac, readServer);
}
