'use client';

import { cn } from 'cn';
import { Fragment } from 'react';

import { Dialog } from './Dialog';
import { HotkeyKeys, keyCaps } from './HotkeyKeys';
import { useIsMac } from './lib/useIsMac';

import type { HotkeySpec } from './lib/useHotkeys';
import type { ReactElement } from 'react';

function byDescription(hotkeys: readonly HotkeySpec[]): Map<string, HotkeySpec[]> {
    const rows = new Map<string, HotkeySpec[]>();
    for (const hotkey of hotkeys) rows.set(hotkey.description, [...(rows.get(hotkey.description) ?? []), hotkey]);
    return rows;
}

export interface HotkeysDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    hotkeys: readonly HotkeySpec[];
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
                {[...byDescription(hotkeys)].map(([description, shortcuts]) => (
                    <li
                        key={description}
                        className={cn('flex items-center justify-between gap-4 py-1.5 text-sm text-(--text)')}
                    >
                        {description}
                        <span className={cn('text-subtle flex items-center gap-2 text-xs')}>
                            {shortcuts.map((hotkey, index) => (
                                <Fragment
                                    key={keyCaps(hotkey, isMac)
                                        .map((cap) => cap.label)
                                        .join('+')}
                                >
                                    {index > 0 ? 'or' : null}
                                    <HotkeyKeys hotkey={hotkey} isMac={isMac} size="md" />
                                </Fragment>
                            ))}
                        </span>
                    </li>
                ))}
            </ul>
        </Dialog>
    );
}
