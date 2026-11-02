'use client';

import { Command } from 'lucide-react';

import { Dialog } from './Dialog';
import { Cap, keyCap } from './KeyCap';
import { cn } from './lib/cn';
import { useIsMac } from './lib/useIsMac';

import type { KeyCap } from './KeyCap';
import type { Hotkey } from './lib/useHotkeys';
import type { ReactElement } from 'react';

function keyCaps({ key, mod }: Hotkey, isMac: boolean): KeyCap[] {
    if (mod !== true) return [keyCap(key)];
    const modifier: KeyCap = isMac ? { label: 'Command', face: Command } : { label: 'Control', face: 'Ctrl' };
    return [modifier, keyCap(key)];
}

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
                        key={`${hotkey.mod === true ? 'mod+' : ''}${hotkey.key}`}
                        className={cn('flex items-center justify-between gap-4 py-1.5 text-sm text-(--text)')}
                    >
                        {hotkey.description}
                        <span className={cn('flex shrink-0 items-center gap-1')}>
                            {keyCaps(hotkey, isMac).map((cap) => (
                                <Cap key={cap.label} cap={cap} size="md" />
                            ))}
                        </span>
                    </li>
                ))}
            </ul>
        </Dialog>
    );
}
