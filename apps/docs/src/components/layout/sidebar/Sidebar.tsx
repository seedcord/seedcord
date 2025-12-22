'use client';

import { usePathname } from 'next/navigation';

import { cn } from '@lib/utils';
import useUIStore from '@store/ui';

import SidebarCategoryList from './SidebarCategoryList';
import SidebarEmptyState from './SidebarEmptyState';
import SidebarHeader from './SidebarHeader';
import { getContainerStyles } from './utils/getContainerStyles';
import { getListStyles } from './utils/getListStyles';
import { useSidebarNavigationHandlers } from './utils/useSidebarNavigationHandlers';
import { useSidebarPersistence } from './utils/useSidebarPersistence';
import { useSidebarScrollGuards } from './utils/useSidebarScrollGuards';
import { useSidebarSelection } from './utils/useSidebarSelection';
import { useSidebarSelectionState } from './utils/useSidebarSelectionState';

import type { SidebarProps } from './types';
import type { ReactElement } from 'react';

// eslint-disable-next-line max-lines-per-function
export function Sidebar({
    catalog,
    activePackageId,
    activeVersionId,
    variant = 'desktop',
    className
}: SidebarProps): ReactElement {
    const pathname = usePathname();
    const containerStyles = getContainerStyles(variant);
    const listStyles = getListStyles(variant);
    const { handleWheel, handleScroll, handleTouchStart, handleTouchMove, handleTouchEnd } = useSidebarScrollGuards();

    const {
        restSegments,
        fallbackPackageId,
        fallbackVersionId,
        effectivePackageId,
        effectiveVersionId,
        setPendingSelection
    } = useSidebarSelectionState(catalog, pathname, activePackageId, activeVersionId);

    const { scrollRef, collapsedStorageKey, composedHandleScroll } = useSidebarPersistence(
        fallbackPackageId,
        fallbackVersionId,
        handleScroll
    );

    const { activePackage, activeVersion, packageOptions, versionOptions } = useSidebarSelection(
        catalog,
        effectivePackageId,
        effectiveVersionId
    );

    const { handlePackageChange, handleVersionChange } = useSidebarNavigationHandlers(
        catalog,
        versionOptions,
        restSegments
    );

    const setSelectedPackage = useUIStore((s) => s.setSelectedPackage);
    const setSelectedVersion = useUIStore((s) => s.setSelectedVersion);

    const onPackageChange = (value: string): void => {
        const nextPackage = catalog.find((entry) => entry.id === value) ?? null;
        const nextVersionId = nextPackage?.versions[0]?.id ?? null;

        setPendingSelection({ packageId: value, versionId: nextVersionId });

        try {
            setSelectedPackage(value);
            if (nextVersionId) {
                setSelectedVersion(nextVersionId);
            }
        } catch {
            // ignore
        }

        handlePackageChange(value);
    };

    const onVersionChange = (value: string): void => {
        const targetPackageId = effectivePackageId || fallbackPackageId;

        if (targetPackageId) {
            setPendingSelection({ packageId: targetPackageId, versionId: value });
        }

        try {
            setSelectedVersion(value);
        } catch {
            // ignore
        }

        handleVersionChange(value);
    };

    if (!activePackage || !activeVersion) {
        return className ? <SidebarEmptyState className={className} /> : <SidebarEmptyState />;
    }

    const isDesktop = variant === 'desktop';

    return (
        <nav
            aria-label="Library navigation"
            className={cn(
                'flex h-full flex-col p-4',
                isDesktop
                    ? 'rounded-none border-0 bg-[color-mix(in_oklab,var(--surface)_82%,transparent)] shadow-none'
                    : 'card bg-surface shadow-soft',
                className
            )}
            style={containerStyles}
        >
            <div className="shrink-0 space-y-3">
                <SidebarHeader
                    packageOptions={packageOptions}
                    versionOptions={versionOptions}
                    activePackage={activePackage}
                    activeVersion={activeVersion}
                    onPackageChange={onPackageChange}
                    onVersionChange={onVersionChange}
                />
            </div>
            <div
                ref={scrollRef}
                className="relative mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pe-1"
                style={listStyles}
                onWheel={handleWheel}
                onScroll={composedHandleScroll}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
            >
                <SidebarCategoryList
                    categories={activeVersion.categories}
                    activeHref={pathname}
                    storageKey={collapsedStorageKey}
                />
            </div>
        </nav>
    );
}

export default Sidebar;
