'use client';

import * as TooltipPrimitive from '@radix-ui/react-tooltip';

import { cn } from './lib/cn';
import { tw } from './lib/tw';

import type { ComponentPropsWithoutRef, ReactElement, ReactNode, Ref } from 'react';

const tooltipContentBaseClassName = cn(
    tw`z-50 max-w-xs`,
    tw`px-2.5 py-1.5`,
    tw`rounded-md`,
    tw`border border-(--border) bg-(--bg-popover) text-(--text)`,
    tw`text-xs/snug`,
    tw`shadow-soft-token`,
    // scale from the radix-injected trigger anchor
    tw`origin-(--radix-tooltip-content-transform-origin)`,
    tw`data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95`,
    tw`data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95`,
    tw`data-[state=closed]:duration-100 data-[state=delayed-open]:duration-150`,
    tw`data-[state=delayed-open]:ease-(--ease-out-strong)`
);

interface TooltipProviderProps extends ComponentPropsWithoutRef<typeof TooltipPrimitive.Provider> {}

export function TooltipProvider({
    delayDuration = 400,
    skipDelayDuration = 300,
    disableHoverableContent = true,
    ...props
}: TooltipProviderProps): ReactElement {
    return (
        <TooltipPrimitive.Provider
            delayDuration={delayDuration}
            skipDelayDuration={skipDelayDuration}
            disableHoverableContent={disableHoverableContent}
            {...props}
        />
    );
}

export const TooltipRoot = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

interface TooltipContentProps extends ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> {
    ref?: Ref<HTMLDivElement>;
}

export function TooltipContent({ className, sideOffset = 6, ...props }: TooltipContentProps): ReactElement {
    return (
        <TooltipPrimitive.Portal>
            <TooltipPrimitive.Content
                sideOffset={sideOffset}
                className={cn(tooltipContentBaseClassName, className)}
                {...props}
            />
        </TooltipPrimitive.Portal>
    );
}

type TooltipRootProps = ComponentPropsWithoutRef<typeof TooltipPrimitive.Root>;
type TooltipContentOnlyProps = Pick<TooltipContentProps, 'side' | 'align' | 'sideOffset'>;

export interface TooltipProps extends Omit<TooltipRootProps, 'children'>, TooltipContentOnlyProps {
    children: ReactNode;
    content: ReactNode;
    contentClassName?: string;
}

export function Tooltip({
    children,
    content,
    side = 'top',
    align = 'center',
    sideOffset,
    contentClassName,
    ...rootProps
}: TooltipProps): ReactElement {
    return (
        <TooltipRoot {...rootProps}>
            <TooltipTrigger asChild>{children}</TooltipTrigger>
            <TooltipContent
                side={side}
                align={align}
                className={cn(contentClassName)}
                {...(sideOffset !== undefined && { sideOffset })}
            >
                {content}
            </TooltipContent>
        </TooltipRoot>
    );
}
