import { useMemo, useState, useEffect, type Dispatch, type SetStateAction } from 'react';

import { resolveRestSegments } from './resolveRestSegments';

import type { SidebarProps } from '../types';
import type { PendingSidebarSelection } from './useSidebarPersistence';

const trimTrailingSlash = (value: string): string => {
    if (value.length > 1 && value.endsWith('/')) return value.slice(0, -1);
    return value;
};

interface SidebarSelectionState {
    restSegments: readonly string[];
    fallbackPackageId: string;
    fallbackVersionId: string;
    effectivePackageId: string;
    effectiveVersionId: string;
    setPendingSelection: Dispatch<SetStateAction<PendingSidebarSelection | null>>;
}
export function useSidebarSelectionState(
    catalog: SidebarProps['catalog'],
    pathname: string,
    activePackageId: string,
    activeVersionId: string
): SidebarSelectionState {
    const restSegments = useMemo(() => resolveRestSegments(pathname), [pathname]);
    const normalizedPathname = useMemo(() => trimTrailingSlash(pathname), [pathname]);

    const resolvedFromPath = useMemo(() => {
        if (!catalog.length || !normalizedPathname) {
            return null;
        }

        for (const entry of catalog) {
            for (const version of entry.versions) {
                const normalizedBasePath = trimTrailingSlash(version.basePath);
                if (
                    normalizedPathname === normalizedBasePath ||
                    normalizedPathname.startsWith(`${normalizedBasePath}/`)
                ) {
                    return { packageId: entry.id, versionId: version.id } satisfies PendingSidebarSelection;
                }
            }
        }

        return null;
    }, [catalog, normalizedPathname]);

    const [pendingSelection, setPendingSelection] = useState<PendingSidebarSelection | null>(null);

    const fallbackPackageId = resolvedFromPath?.packageId ?? activePackageId;
    const fallbackVersionId = resolvedFromPath?.versionId ?? activeVersionId;

    const pendingPackageId = pendingSelection?.packageId ?? null;
    const pendingVersionId = pendingSelection?.versionId ?? null;

    const effectivePackageId = pendingPackageId ?? fallbackPackageId;
    const effectiveVersionId = useMemo(() => {
        if (pendingPackageId && pendingPackageId === effectivePackageId && pendingVersionId) {
            return pendingVersionId;
        }

        return fallbackVersionId;
    }, [pendingPackageId, effectivePackageId, pendingVersionId, fallbackVersionId]);

    useEffect(() => {
        if (!pendingSelection) {
            return undefined;
        }

        const matchesPackage = pendingSelection.packageId === fallbackPackageId;
        const matchesVersion = pendingSelection.versionId ? pendingSelection.versionId === fallbackVersionId : true;

        if (!matchesPackage || !matchesVersion) {
            return undefined;
        }

        const timeoutId = window.setTimeout(() => {
            setPendingSelection(null);
        }, 0);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [pendingSelection, fallbackPackageId, fallbackVersionId]);

    return {
        restSegments,
        fallbackPackageId,
        fallbackVersionId,
        effectivePackageId,
        effectiveVersionId,
        setPendingSelection
    } satisfies SidebarSelectionState;
}
