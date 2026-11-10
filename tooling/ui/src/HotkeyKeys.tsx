'use client';

import { cn } from 'cn';
import { ArrowBigUp, Command } from 'lucide-react';

import { Cap, keyCap } from './KeyCap';

import type { KbdSize } from './Kbd';
import type { KeyCap } from './KeyCap';
import type { HotkeySpec } from './lib/useHotkeys';
import type { ReactElement } from 'react';

const SHIFT: KeyCap = { label: 'Shift', face: ArrowBigUp, aria: 'Shift' };
const COMMAND: KeyCap = { label: 'Command', face: Command, aria: 'Meta' };
const CONTROL: KeyCap = { label: 'Control', face: 'Ctrl', aria: 'Control' };

export function keyCaps({ key, mod, shift }: HotkeySpec, isMac: boolean): KeyCap[] {
    return [...(mod === true ? [isMac ? COMMAND : CONTROL] : []), ...(shift === true ? [SHIFT] : []), keyCap(key)];
}

// aria-keyshortcuts joins a shortcut's keys with + and separate shortcuts with a space
export function ariaKeyshortcuts(hotkeys: readonly HotkeySpec[], isMac: boolean): string {
    return hotkeys
        .map((hotkey) =>
            keyCaps(hotkey, isMac)
                .map((cap) => cap.aria)
                .join('+')
        )
        .join(' ');
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
