'use client';

import { useRef } from 'react';

export interface FocusReturn {
    onOpenAutoFocus: () => void;
    onCloseAutoFocus: (event: Event) => void;
}

// radix's modal dialog focuses its Trigger on close. these dialogs open without one.
export function useFocusReturn(): FocusReturn {
    const focusedBeforeOpen = useRef<Element | null>(null);

    return {
        onOpenAutoFocus: () => {
            focusedBeforeOpen.current = document.activeElement;
        },
        onCloseAutoFocus: (event) => {
            event.preventDefault();
            if (focusedBeforeOpen.current instanceof HTMLElement) focusedBeforeOpen.current.focus();
        }
    };
}
