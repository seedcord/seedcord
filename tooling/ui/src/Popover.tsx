'use client';

import * as PopoverPrimitive from '@radix-ui/react-popover';

import { cn } from './lib/cn';
import { tw } from './lib/tw';

import type { ComponentPropsWithoutRef, ReactElement } from 'react';

const popoverContentBaseClassName = cn(
    // z-70 so popovers render above the MobilePanelDialog
    tw`z-70`,
    tw`rounded-md`,
    tw`border border-(--border) bg-(--bg-popover) text-(--text)`,
    tw`p-4 shadow-(--shadow-card)`,
    // radix focuses the panel on open, and chrome paints its own ring around the whole thing. the rows carry theirs
    tw`focus-visible:outline-hidden`,
    // scale from the radix-injected trigger anchor
    tw`origin-(--radix-popover-content-transform-origin)`,
    tw`data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95`,
    tw`data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95`,
    tw`data-[state=closed]:duration-100 data-[state=open]:duration-150`,
    tw`data-[state=open]:ease-(--ease-out-strong)`
);

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;
export const PopoverClose = PopoverPrimitive.Close;

interface PopoverContentProps extends ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> {
    // portal target. pass a modal Dialog's content node so the popover lands inside its
    // react-remove-scroll region. otherwise the body portal can't scroll inside the dialog
    container?: HTMLElement | null;
}

export function PopoverContent({ className, sideOffset = 8, container, ...props }: PopoverContentProps): ReactElement {
    return (
        <PopoverPrimitive.Portal container={container ?? undefined}>
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
