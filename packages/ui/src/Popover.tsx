'use client';

import * as PopoverPrimitive from '@radix-ui/react-popover';

import { cn } from './lib/cn';
import { tw } from './lib/tw';

import type { ComponentPropsWithoutRef, ReactElement } from 'react';

const popoverContentBaseClassName = [
    // z-70 so popovers render above the MobilePanelDialog
    tw`z-70`,
    tw`rounded-lg`,
    tw`border border-(--border) bg-(--bg-popover) text-(--text)`,
    tw`p-4 shadow-(--shadow-card)`,
    // scale from the radix-injected trigger anchor, not the panel center
    tw`origin-(--radix-popover-content-transform-origin)`,
    tw`data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95`,
    tw`data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95`,
    tw`data-[state=closed]:duration-100 data-[state=open]:duration-150`,
    tw`data-[state=open]:ease-(--ease-out-strong)`
].join(' ');

// Use for floating anchored content (menus, settings panels). Don't roll Radix Popover by hand.
export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;
export const PopoverClose = PopoverPrimitive.Close;

interface PopoverContentProps extends ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> {}

export function PopoverContent({ className, sideOffset = 8, ...props }: PopoverContentProps): ReactElement {
    return (
        <PopoverPrimitive.Portal>
            <PopoverPrimitive.Content
                sideOffset={sideOffset}
                className={cn(popoverContentBaseClassName, className)}
                {...props}
            />
        </PopoverPrimitive.Portal>
    );
}

interface PopoverArrowProps extends ComponentPropsWithoutRef<typeof PopoverPrimitive.Arrow> {}

export function PopoverArrow({ className, ...props }: PopoverArrowProps): ReactElement {
    return <PopoverPrimitive.Arrow {...props} className={cn('fill-(--bg-popover)', className)} />;
}
