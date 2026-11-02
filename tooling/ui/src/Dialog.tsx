'use client';

import * as RadixDialog from '@radix-ui/react-dialog';

import { CloseControls } from './CloseControls';
import { cn } from './lib/cn';
import { tw } from './lib/tw';
import { useFocusReturn } from './lib/useFocusReturn';

import type { ReactElement, ReactNode, Ref } from 'react';

const PLACEMENTS = {
    center: tw`top-1/2 left-1/2 max-h-[85vh] w-[min(440px,92vw)] -translate-1/2 rounded-md p-4 data-[state=closed]:zoom-out-95 data-[state=closed]:fade-out data-[state=open]:zoom-in-95 data-[state=open]:fade-in`,
    sheet: tw`inset-x-0 bottom-0 max-h-[80vh] origin-bottom rounded-t-md p-4 pb-2 data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom sm:inset-y-auto sm:bottom-6 sm:left-1/2 sm:max-h-[85vh] sm:w-[min(480px,92vw)] sm:-translate-x-1/2 sm:rounded-md`
} as const;

export type DialogPlacement = keyof typeof PLACEMENTS;

export interface DialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    children: ReactNode;
    footer?: ReactNode;
    placement?: DialogPlacement;
    closeLabel?: string;
    ref?: Ref<HTMLDivElement>;
}

// radix focuses the close button by default
function focusTheBox(event: Event): void {
    event.preventDefault();
    if (event.currentTarget instanceof HTMLElement) event.currentTarget.focus();
}

export function Dialog({
    open,
    onOpenChange,
    title,
    description,
    children,
    footer,
    placement = 'center',
    closeLabel = 'Close',
    ref
}: DialogProps): ReactElement {
    const focusReturn = useFocusReturn();

    return (
        <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
            <RadixDialog.Portal>
                <RadixDialog.Overlay
                    className={cn(
                        'fixed inset-0 z-50 bg-(--overlay-dim)',
                        'data-[state=closed]:animate-out data-[state=closed]:fade-out',
                        'data-[state=open]:animate-in data-[state=open]:fade-in'
                    )}
                />
                <RadixDialog.Content
                    ref={ref}
                    aria-modal
                    onOpenAutoFocus={(event) => {
                        focusReturn.onOpenAutoFocus();
                        focusTheBox(event);
                    }}
                    onCloseAutoFocus={focusReturn.onCloseAutoFocus}
                    className={cn(
                        'border-border shadow-soft fixed z-60 flex flex-col border bg-(--bg-dim-subtle) outline-hidden',
                        'data-[state=closed]:animate-out data-[state=open]:animate-in',
                        PLACEMENTS[placement]
                    )}
                >
                    <RadixDialog.Description className={cn('sr-only')}>{description}</RadixDialog.Description>
                    <div className={cn('mb-3 flex shrink-0 items-center justify-between')}>
                        <RadixDialog.Title className={cn('text-subtle text-sm font-semibold tracking-wide uppercase')}>
                            {title}
                        </RadixDialog.Title>
                        <CloseControls onClose={() => onOpenChange(false)} label={closeLabel} />
                    </div>
                    <div className={cn('flex min-h-0 flex-col')}>{children}</div>
                    {footer ? <div className={cn('shrink-0 pt-2')}>{footer}</div> : null}
                </RadixDialog.Content>
            </RadixDialog.Portal>
        </RadixDialog.Root>
    );
}
