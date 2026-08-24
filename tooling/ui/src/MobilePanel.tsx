'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { createContext, use, useState } from 'react';

import { Button } from './Button';
import { cn } from './lib/cn';

import type { ReactElement, ReactNode } from 'react';

// a popover portaled to document.body renders mispositioned and inert under the modal dialog
const MobilePanelContainerContext = createContext<HTMLElement | null>(null);

export function useMobilePanelContainer(): HTMLElement | null {
    return use(MobilePanelContainerContext);
}

export interface MobilePanelProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    children: ReactNode;
    footer?: ReactNode;
}

export function MobilePanel({
    open,
    onOpenChange,
    title,
    description,
    children,
    footer
}: MobilePanelProps): ReactElement {
    const [panel, setPanel] = useState<HTMLElement | null>(null);

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay
                    className={cn(
                        'fixed inset-0 z-50 bg-(--overlay-dim) data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:animate-in data-[state=open]:fade-in'
                    )}
                />
                <Dialog.Content
                    ref={setPanel}
                    className={cn(
                        'border-border shadow-soft fixed inset-x-0 bottom-0 z-60 flex max-h-[80vh] origin-bottom flex-col rounded-t-md border bg-(--bg-dim-subtle) p-4 pb-2 data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom sm:inset-y-auto sm:bottom-6 sm:left-1/2 sm:max-h-[85vh] sm:w-[min(480px,92vw)] sm:-translate-x-1/2 sm:rounded-md'
                    )}
                >
                    <Dialog.Description className={cn('sr-only')}>{description}</Dialog.Description>
                    <div className={cn('mb-3 flex shrink-0 items-center justify-between')}>
                        <Dialog.Title className={cn('text-subtle text-sm font-semibold tracking-wide uppercase')}>
                            {title}
                        </Dialog.Title>
                        <Dialog.Close asChild>
                            <Button variant="ghost" size="icon" aria-label="Close panel" className={cn('text-subtle')}>
                                <X className={cn('size-4')} aria-hidden />
                            </Button>
                        </Dialog.Close>
                    </div>
                    <div className={cn('flex min-h-0 flex-col')}>
                        <MobilePanelContainerContext value={panel}>{children}</MobilePanelContainerContext>
                    </div>
                    {footer ? <div className={cn('shrink-0 pt-2')}>{footer}</div> : null}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
