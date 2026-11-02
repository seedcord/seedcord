'use client';

import { Slot } from '@radix-ui/react-slot';

import { ariaKeyshortcuts, HotkeyKeys } from './HotkeyKeys';
import { cn } from './lib/cn';
import { useIsMac } from './lib/useIsMac';
import { Tooltip } from './Tooltip';

import type { HotkeySpec } from './lib/useHotkeys';
import type { ReactElement, ReactNode } from 'react';

export interface HotkeyHintProps {
    hotkey: HotkeySpec;
    children: ReactNode;
}

export function HotkeyHint({ hotkey, children }: HotkeyHintProps): ReactElement {
    const isMac = useIsMac();

    return (
        <Tooltip
            content={
                <span className={cn('flex items-center gap-2')}>
                    {hotkey.description}
                    <HotkeyKeys hotkey={hotkey} isMac={isMac} size="sm" />
                </span>
            }
        >
            <Slot aria-keyshortcuts={ariaKeyshortcuts([hotkey], isMac)}>{children}</Slot>
        </Tooltip>
    );
}
