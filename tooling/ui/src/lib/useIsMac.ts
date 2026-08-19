'use client';

import { useSyncExternalStore } from 'react';

const MAC_SIGNAL = /Mac|iPhone|iPad|iPod/i;

// navigator.platform is deprecated and still the most reliable mac signal
function isMacPlatform(nav: { platform?: string; userAgent?: string }): boolean {
    const platform = nav.platform ?? '';
    return MAC_SIGNAL.test(platform === '' ? (nav.userAgent ?? '') : platform);
}

const subscribe = (): (() => void) => () => {};
const readIsMac = (): boolean => isMacPlatform(navigator);
// false on the server so the first client paint matches what was rendered
const readServer = (): boolean => false;

export function useIsMac(): boolean {
    return useSyncExternalStore(subscribe, readIsMac, readServer);
}
