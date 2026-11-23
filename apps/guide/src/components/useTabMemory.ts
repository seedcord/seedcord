'use client';

import { sessionItems, useStoredItem } from '@seedcord/ui';
import { useCallback, useEffect, useMemo } from 'react';

const STORAGE_KEY = 'guide-tab-pages';

type TabPages = Readonly<Record<string, string>>;

function parsePages(raw: string | null): TabPages {
    if (raw === null) return {};
    try {
        const pages: unknown = JSON.parse(raw);
        if (typeof pages !== 'object' || pages === null) return {};
        return Object.fromEntries(
            Object.entries(pages).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
        );
    } catch {
        // another script can write anything under this key
        return {};
    }
}

// a tab links to the last page you opened in it, or to its first page before you open one
export function useTabMemory(tabHref: string, pathname: string): (href: string) => string {
    const raw = useStoredItem(sessionItems, STORAGE_KEY);
    const pages = useMemo(() => parsePages(raw), [raw]);

    useEffect(() => {
        if (pages[tabHref] === pathname) return;
        sessionItems.write(STORAGE_KEY, JSON.stringify({ ...pages, [tabHref]: pathname }));
    }, [tabHref, pathname, pages]);

    return useCallback((href: string) => pages[href] ?? href, [pages]);
}
