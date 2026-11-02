'use client';

import { Dialog } from './Dialog';
import { HotkeyKeys, keyCaps } from './HotkeyKeys';
import { cn } from './lib/cn';
import { useIsMac } from './lib/useIsMac';

import type { Hotkey } from './lib/useHotkeys';
import type { ReactElement } from 'react';

export interface HotkeysDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    hotkeys: readonly Hotkey[];
}

export function HotkeysDialog({ open, onOpenChange, hotkeys }: HotkeysDialogProps): ReactElement {
    const isMac = useIsMac();

    return (
        <Dialog
            open={open}
            onOpenChange={onOpenChange}
            title="Keyboard shortcuts"
            description="Keys you can press on this site."
        >
            <ul className={cn('nice-scroll min-h-0 space-y-1 overflow-y-auto')}>
                {hotkeys.map((hotkey) => (
                    <li
                        key={keyCaps(hotkey, isMac)
                            .map((cap) => cap.label)
                            .join('+')}
                        className={cn('flex items-center justify-between gap-4 py-1.5 text-sm text-(--text)')}
                    >
                        {hotkey.description}
                        <HotkeyKeys hotkey={hotkey} isMac={isMac} size="md" />
                    </li>
                ))}
            </ul>
        </Dialog>
    );
}
