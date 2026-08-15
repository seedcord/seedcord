import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';

import { resolveRestSegments } from './resolveRestSegments';

import type { PendingSidebarSelection } from './useSidebarPersistence';
import type { SidebarProps } from '#components/layout/sidebar/types';

function trimTrailingSlash(value: string): string {
    if (value.length > 1 && value.endsWith('/')) return value.slice(0, -1);
    return value;
}

interface SidebarSelectionState {
    restSegments: readonly string[];
    fallbackPackageId: string;
    fallbackVersionId: string;
    effectivePackageId: string;
    effectiveVersionId: string;
    setPendingSelection: Dispatch<SetStateAction<PendingSidebarSelection | null>>;
    // true until the switch commits, while the catalog still shows the prior selection's categories
    isPendingSelection: boolean;
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

    // react allows setState during render, so this clears the pending selection here once
    // the fallback matches, skipping a deferred effect.
    if (pendingSelection) {
        const matchesPackage = pendingSelection.packageId === fallbackPackageId;
        const matchesVersion = pendingSelection.versionId ? pendingSelection.versionId === fallbackVersionId : true;
        if (matchesPackage && matchesVersion) {
            setPendingSelection(null);
        }
    }

    const effectivePending = pendingSelection;
    const pendingPackageId = effectivePending?.packageId ?? null;
    const pendingVersionId = effectivePending?.versionId ?? null;

    const effectivePackageId = pendingPackageId ?? fallbackPackageId;
    const effectiveVersionId = useMemo(() => {
        if (pendingPackageId && pendingPackageId === effectivePackageId && pendingVersionId) {
            return pendingVersionId;
        }

        return fallbackVersionId;
    }, [pendingPackageId, effectivePackageId, pendingVersionId, fallbackVersionId]);

    return {
        restSegments,
        fallbackPackageId,
        fallbackVersionId,
        effectivePackageId,
        effectiveVersionId,
        setPendingSelection,
        isPendingSelection: pendingSelection !== null
    } satisfies SidebarSelectionState;
}
