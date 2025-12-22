import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

import Button from '@ui/Button';

import type { ReactNode } from 'react';

function MobilePanelDialog({
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
                <Dialog.Overlay className="data-[state=open]:animate-in data-[state=open]:fade-in data-[state=closed]:animate-out data-[state=closed]:fade-out fixed inset-0 z-50 bg-[color-mix(in_oklab,var(--bg)_72%,#0f172acc_28%)] backdrop-blur-sm" />
                <Dialog.Content className="border-border shadow-soft data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom fixed inset-x-0 bottom-0 z-60 origin-bottom rounded-t-2xl border bg-[color-mix(in_oklab,var(--bg)_96%,#0f172a_4%)] p-4 sm:inset-y-auto sm:bottom-6 sm:left-1/2 sm:max-h-[85vh] sm:w-[min(480px,92vw)] sm:-translate-x-1/2 sm:rounded-2xl">
                    <div className="mb-3 flex items-center justify-between">
                        <Dialog.Title className="text-subtle text-sm font-semibold tracking-wide uppercase">
                            {title}
                        </Dialog.Title>
                        <Dialog.Close asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Close panel"
                                className="text-subtle rounded-full"
                            >
                                <X className="h-4 w-4" aria-hidden />
                            </Button>
                        </Dialog.Close>
                    </div>
                    <div className="max-h-[70vh] overflow-y-auto pe-1 pb-1">{children}</div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

export default MobilePanelDialog;
