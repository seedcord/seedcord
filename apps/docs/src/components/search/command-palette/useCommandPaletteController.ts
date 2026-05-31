'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { log } from '@lib/logger';
import { useUIStore, type UIStore } from '@store/ui';

import { FOCUS_DELAY_MS } from './constants';

import type { CommandAction } from './types';

// `action.href` already carries the correct member fragment from the search route; this only
// strips the origin for router.push / window.open.
function buildNavigationHref(action: CommandAction, origin: string): string {
    try {
        const targetUrl = new URL(action.href, origin);
        return `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;
    } catch {
        return action.href;
    }
}

export interface CommandPaletteController {
    open: boolean;
    mounted: boolean;
    searchValue: string;
    inputRef: RefObject<HTMLInputElement | null>;
    handleOpenChange: (open: boolean) => void;
    handleValueChange: (value: string) => void;
    handleClose: () => void;
    handleSelect: (action: CommandAction) => void;
}

export function useCommandPaletteController(): CommandPaletteController {
    const { open, setCommandPaletteOpen } = useUIStore(
        useShallow((state: UIStore) => ({
            open: state.isCommandPaletteOpen,
            setCommandPaletteOpen: state.setCommandPaletteOpen
        }))
    );
    const router = useRouter();
    const pathname = usePathname();
    const inputRef = useRef<HTMLInputElement>(null);
    const [searchValue, setSearchValue] = useState('');
    const [mounted] = useState(() => typeof window !== 'undefined');

    useEffect(() => {
        if (!mounted) return undefined;

        if (open) {
            // justified: animation-coupled, input lives behind a Radix <Dialog> mount and only receives focus after the surface paints in.
            const focusTimeout = window.setTimeout(() => {
                inputRef.current?.focus();
            }, FOCUS_DELAY_MS);
            log('Command palette opened', { fromPath: pathname });
            return () => {
                window.clearTimeout(focusTimeout);
            };
        }

        log('Command palette closed');
        return undefined;
    }, [mounted, open, pathname]);

    const handleOpenChange = useCallback(
        (next: boolean): void => {
            if (next) setSearchValue('');
            setCommandPaletteOpen(next);
        },
        [setCommandPaletteOpen]
    );

    const handleClose = useCallback(() => setCommandPaletteOpen(false), [setCommandPaletteOpen]);

    const handleSelect = useCallback(
        (action: CommandAction): void => {
            log('Command palette item selected', action);
            handleClose();

            if (action.isExternal) {
                window.open(action.href, '_blank', 'noopener');
                return;
            }

            if (typeof window !== 'undefined') {
                const targetHref = buildNavigationHref(action, window.location.origin);
                router.push(targetHref);
                return;
            }

            router.push(action.href);
        },
        [handleClose, router]
    );

    return {
        open,
        mounted,
        searchValue,
        inputRef,
        handleOpenChange,
        handleValueChange: setSearchValue,
        handleClose,
        handleSelect
    };
}
