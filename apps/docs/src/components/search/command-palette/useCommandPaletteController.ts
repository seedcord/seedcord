'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { log } from '@lib/logger';
import { useUIStore, type UIStore } from '@store/ui';

import { FOCUS_DELAY_MS } from './constants';

import type { CommandAction } from './types';

type ActionKind = CommandAction['kind'];

const MEMBER_ANCHOR_PREFIX: Partial<Record<ActionKind, string>> = {
    method: 'method',
    property: 'property',
    variable: 'property',
    typeParameter: 'typeParameter',
    constructor: 'constructor',
    enumMember: 'enum-member'
};

function resolveMemberAnchor(kind: ActionKind, params: URLSearchParams): string | null {
    const prefix = MEMBER_ANCHOR_PREFIX[kind];

    if (prefix) {
        const paramKey = prefix === 'typeParameter' ? 'typeparam' : 'member';
        const id = params.get(paramKey);
        return id ? `${prefix}-${id}` : null;
    }

    if (kind === 'parameter') {
        const owningMember = params.get('member');
        return owningMember ? `method-${owningMember}` : null;
    }

    return null;
}

function buildNavigationHref(action: CommandAction, origin: string): string {
    try {
        const targetUrl = new URL(action.href, origin);
        const anchor = resolveMemberAnchor(action.kind, targetUrl.searchParams);

        if (anchor) {
            targetUrl.hash = anchor;
        }

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
    handleKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
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
            const resetTimeout = window.setTimeout(() => setSearchValue(''), 0);
            const focusTimeout = window.setTimeout(() => {
                inputRef.current?.focus();
            }, FOCUS_DELAY_MS);
            log('Command palette opened', { fromPath: pathname });
            return () => {
                window.clearTimeout(resetTimeout);
                window.clearTimeout(focusTimeout);
            };
        }

        log('Command palette closed');
        return undefined;
    }, [mounted, open, pathname]);

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

    const handleKeyDown = useCallback(
        (event: KeyboardEvent<HTMLDivElement>) => {
            if (event.key === 'Escape') {
                handleClose();
            }
        },
        [handleClose]
    );

    return {
        open,
        mounted,
        searchValue,
        inputRef,
        handleOpenChange: setCommandPaletteOpen,
        handleValueChange: setSearchValue,
        handleClose,
        handleSelect,
        handleKeyDown
    };
}
