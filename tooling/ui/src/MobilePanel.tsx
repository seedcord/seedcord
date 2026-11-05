'use client';

import { createContext, use, useState } from 'react';

import { Dialog } from './Dialog';

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
        <Dialog
            ref={setPanel}
            open={open}
            onOpenChange={onOpenChange}
            title={title}
            description={description}
            footer={footer}
            placement="sheet"
            closeLabel="Close panel"
        >
            <MobilePanelContainerContext value={panel}>{children}</MobilePanelContainerContext>
        </Dialog>
    );
}
