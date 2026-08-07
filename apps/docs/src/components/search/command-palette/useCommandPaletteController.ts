'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { log } from '@lib/logger';
import { useUIStore, type UIStore } from '@store/ui';

import { FOCUS_DELAY_MS } from './constants';

import type { CommandAction, DocsPackageOption } from './types';

// action.href already carries the right member fragment from the search route
function buildNavigationHref(action: CommandAction, origin: string): string {
    try {
        const targetUrl = new URL(action.href, origin);
        return `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;
    } catch {
        return action.href;
    }
}

function usePackageList(open: boolean): DocsPackageOption[] {
    const [packages, setPackages] = useState<DocsPackageOption[]>([]);

    useEffect(() => {
        if (!open || packages.length > 0) return undefined;

        const abort = new AbortController();
        fetch('/search?list=packages', { signal: abort.signal })
            .then((response) => (response.ok ? (response.json() as Promise<{ packages?: DocsPackageOption[] }>) : null))
            .then((payload) => {
                if (payload && Array.isArray(payload.packages)) setPackages(payload.packages);
            })
            .catch(() => undefined);

        return () => {
            abort.abort();
        };
    }, [open, packages.length]);

    return packages;
}

interface SearchFilters {
    scope: string;
    kind: string;
    prerelease: boolean;
    handleScopeChange: (scope: string) => void;
    handleKindChange: (kind: string) => void;
    handlePrereleaseChange: (prerelease: boolean) => void;
    resetFilters: () => void;
}

function useSearchFilters(): SearchFilters {
    const [filters, setFilters] = useState({ scope: 'all', kind: 'all', prerelease: false });
    const handleScopeChange = useCallback((scope: string) => setFilters((prev) => ({ ...prev, scope })), []);
    const handleKindChange = useCallback((kind: string) => setFilters((prev) => ({ ...prev, kind })), []);
    const handlePrereleaseChange = useCallback(
        (prerelease: boolean) => setFilters((prev) => ({ ...prev, prerelease })),
        []
    );
    const resetFilters = useCallback(() => setFilters({ scope: 'all', kind: 'all', prerelease: false }), []);
    return { ...filters, handleScopeChange, handleKindChange, handlePrereleaseChange, resetFilters };
}

export interface CommandPaletteController {
    open: boolean;
    mounted: boolean;
    searchValue: string;
    scope: string;
    kind: string;
    prerelease: boolean;
    packages: DocsPackageOption[];
    inputRef: RefObject<HTMLInputElement | null>;
    handleOpenChange: (open: boolean) => void;
    handleValueChange: (value: string) => void;
    handleScopeChange: (scope: string) => void;
    handleKindChange: (kind: string) => void;
    handlePrereleaseChange: (prerelease: boolean) => void;
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
    const { scope, kind, prerelease, handleScopeChange, handleKindChange, handlePrereleaseChange, resetFilters } =
        useSearchFilters();
    const [mounted] = useState(() => typeof window !== 'undefined');
    const packages = usePackageList(open);

    useEffect(() => {
        if (!mounted) return undefined;

        if (open) {
            // justified: animation-coupled, input lives behind a Radix <Dialog> mount and only receives focus after the surface paints in.
            const focusTimeout = window.setTimeout(() => {
                inputRef.current?.select();
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
            if (next) {
                setSearchValue('');
                resetFilters();
            }
            setCommandPaletteOpen(next);
        },
        [setCommandPaletteOpen, resetFilters]
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
        scope,
        kind,
        prerelease,
        packages,
        inputRef,
        handleOpenChange,
        handleValueChange: setSearchValue,
        handleScopeChange,
        handleKindChange,
        handlePrereleaseChange,
        handleClose,
        handleSelect
    };
}
