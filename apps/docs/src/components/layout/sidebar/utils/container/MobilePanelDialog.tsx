import * as Dialog from '@radix-ui/react-dialog';
import { Button, cn } from '@seedcord/ui';
import { X } from 'lucide-react';

import type { ReactNode } from 'react';

export function MobilePanelDialog({
    open,
    onOpenChange,
    title,
    children
}: {
    open: boolean;
    onOpenChange: (value: boolean) => void;
    title: string;
    children: ReactNode;
}): ReactNode {
    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay
                    className={cn(
                        'fixed inset-0 z-50 bg-(--overlay-dim) data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:animate-in data-[state=open]:fade-in'
                    )}
                />
                <Dialog.Content
                    className={cn(
                        'border-border shadow-soft fixed inset-x-0 bottom-0 z-60 grid max-h-[80vh] origin-bottom grid-rows-[auto_minmax(0,1fr)] rounded-t-lg border bg-(--bg-dim-subtle) p-4 data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom sm:inset-y-auto sm:bottom-6 sm:left-1/2 sm:max-h-[85vh] sm:w-[min(480px,92vw)] sm:-translate-x-1/2 sm:rounded-lg'
                    )}
                >
                    <Dialog.Description className={cn('sr-only')}>
                        Slide-in navigation panel for the docs sidebar.
                    </Dialog.Description>
                    <div className={cn('mb-3 flex shrink-0 items-center justify-between')}>
                        <Dialog.Title className={cn('text-subtle text-sm font-semibold tracking-wide uppercase')}>
                            {title}
                        </Dialog.Title>
                        <Dialog.Close asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Close panel"
                                className={cn('text-subtle rounded-full')}
                            >
                                <X className={cn('size-4')} aria-hidden />
                            </Button>
                        </Dialog.Close>
                    </div>
                    <div
                        className={cn('min-h-0 overflow-y-auto overscroll-contain pe-1 pb-1')}
                        style={{ WebkitOverflowScrolling: 'touch' }}
                    >
                        {children}
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
