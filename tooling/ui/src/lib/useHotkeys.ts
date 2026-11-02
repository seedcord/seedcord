'use client';

import { useEffect, useEffectEvent } from 'react';

import type { KeyName } from '#src/KeyCap';

export interface Hotkey {
    key: KeyName;
    mod?: boolean; // Cmd on a mac, Ctrl everywhere else
    description: string;
    run: () => void;
}

const FIELD_OR_DIALOG = 'input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="dialog"]';

const inFieldOrDialog = (target: EventTarget | null): boolean =>
    target instanceof Element && target.closest(FIELD_OR_DIALOG) !== null;

// shift isn't checked because typing `?` needs it
function matches(hotkey: Hotkey, event: KeyboardEvent): boolean {
    const modHeld = event.metaKey || event.ctrlKey;
    if (hotkey.mod === true) return modHeld && event.key.toLowerCase() === hotkey.key;
    if (modHeld || event.altKey || event.defaultPrevented) return false;
    return event.key === hotkey.key && !inFieldOrDialog(event.target);
}

export function useHotkeys(hotkeys: readonly Hotkey[]): void {
    const onKeyDown = useEffectEvent((event: KeyboardEvent): void => {
        const hotkey = hotkeys.find((row) => matches(row, event));
        if (hotkey === undefined) return;

        event.preventDefault();
        hotkey.run();
    });

    useEffect(() => {
        globalThis.addEventListener('keydown', onKeyDown);
        return () => globalThis.removeEventListener('keydown', onKeyDown);
    }, []);
}
