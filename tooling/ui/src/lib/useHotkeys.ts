'use client';

import { useEffect, useEffectEvent } from 'react';

import type { KeyName } from '#src/KeyCap';

export interface Hotkey {
    key: KeyName;
    mod?: boolean; // Cmd on a mac, Ctrl everywhere else
    // ignored for a key that types a character, since keyboard layouts put `?` and `/` on different keys
    shift?: boolean;
    description: string;
    run: () => void;
}

const typesCharacter = (key: string): boolean => key.length === 1;

// caret browsing moves and extends a selection with the arrows
const hasTextSelection = (): boolean => globalThis.getSelection()?.isCollapsed === false;

const FIELD_OR_DIALOG = 'input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="dialog"]';

const inFieldOrDialog = (target: EventTarget | null): boolean =>
    target instanceof Element && target.closest(FIELD_OR_DIALOG) !== null;

function matches(hotkey: Hotkey, event: KeyboardEvent): boolean {
    const modHeld = event.metaKey || event.ctrlKey;
    if (hotkey.mod === true) return modHeld && event.key.toLowerCase() === hotkey.key;
    if (modHeld || event.altKey || event.defaultPrevented) return false;
    if (event.key !== hotkey.key || inFieldOrDialog(event.target)) return false;
    if (typesCharacter(hotkey.key)) return true;
    return event.shiftKey === (hotkey.shift === true) && !hasTextSelection();
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
