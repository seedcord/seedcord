'use client';

import * as TooltipPrimitive from '@radix-ui/react-tooltip';

import { cn } from '@lib/utils';

import type { ReactElement, ReactNode } from 'react';

export interface TooltipProps {
    children: ReactNode;
    content: ReactNode;
    side?: 'top' | 'right' | 'bottom' | 'left';
    align?: 'start' | 'center' | 'end';
    delayDuration?: number;
    className?: string;
}

export function Tooltip({
    children,
    content,
    side = 'top',
    align = 'center',
    delayDuration = 200,
    className
}: TooltipProps): ReactElement {
    return (
        <TooltipPrimitive.Provider delayDuration={delayDuration}>
            <TooltipPrimitive.Root>
                <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
                <TooltipPrimitive.Portal>
                    <TooltipPrimitive.Content
                        side={side}
                        align={align}
                        sideOffset={4}
                        className={cn(
                            'animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 overflow-hidden rounded-md border border-(--border) bg-(--bg-surface-moderate) px-3 py-1.5 text-xs font-medium text-(--text) shadow-md',
                            className
                        )}
                    >
                        {content}
                    </TooltipPrimitive.Content>
                </TooltipPrimitive.Portal>
            </TooltipPrimitive.Root>
        </TooltipPrimitive.Provider>
    );
}

export default Tooltip;
