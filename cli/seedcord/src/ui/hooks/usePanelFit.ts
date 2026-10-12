import { useRef } from 'react';

import { useMeasuredBox } from '#ui/hooks/useMeasuredBox';

import type { DOMElement } from 'ink';
import type { RefObject } from 'react';

export interface PanelFit {
    readonly panelRef: RefObject<DOMElement | null>;
    readonly contentRef: RefObject<DOMElement | null>;
    readonly fits: boolean;
}

export function usePanelFit(): PanelFit {
    const panelRef = useRef<DOMElement | null>(null);
    const contentRef = useRef<DOMElement | null>(null);
    const panel = useMeasuredBox(panelRef);
    const content = useMeasuredBox(contentRef);

    return { panelRef, contentRef, fits: content.height <= panel.height };
}
