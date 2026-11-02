'use client';

import { ArrowBigUp, Command } from 'lucide-react';

import { Cap, keyCap } from './KeyCap';
import { cn } from './lib/cn';

import type { KbdSize } from './Kbd';
import type { KeyCap } from './KeyCap';
import type { HotkeySpec } from './lib/useHotkeys';
import type { ReactElement } from 'react';

const SHIFT: KeyCap = { label: 'Shift', face: ArrowBigUp };

export function keyCaps({ key, mod, shift }: HotkeySpec, isMac: boolean): KeyCap[] {
    const modifier: KeyCap = isMac ? { label: 'Command', face: Command } : { label: 'Control', face: 'Ctrl' };
    return [...(mod === true ? [modifier] : []), ...(shift === true ? [SHIFT] : []), keyCap(key)];
}

// aria-keyshortcuts modifiers are Meta, Control and Shift, joined to the key with +
function ariaKeyshortcut({ key, mod, shift }: HotkeySpec, isMac: boolean): string {
    const modifiers = [...(mod === true ? [isMac ? 'Meta' : 'Control'] : []), ...(shift === true ? ['Shift'] : [])];
    return [...modifiers, key.length === 1 ? key.toUpperCase() : key].join('+');
}

export function ariaKeyshortcuts(hotkeys: readonly HotkeySpec[], isMac: boolean): string {
    return hotkeys.map((hotkey) => ariaKeyshortcut(hotkey, isMac)).join(' ');
}

export function HotkeyKeys({
    hotkey,
    isMac,
    size
}: {
    hotkey: HotkeySpec;
    isMac: boolean;
    size: KbdSize;
}): ReactElement {
    return (
        <span className={cn('flex shrink-0 items-center gap-1')}>
            {keyCaps(hotkey, isMac).map((cap) => (
                <Cap key={cap.label} cap={cap} size={size} />
            ))}
        </span>
    );
}
