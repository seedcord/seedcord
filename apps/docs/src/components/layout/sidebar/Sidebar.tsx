'use client';

import { Card, cn } from '@seedcord/ui';
import { usePathname } from 'next/navigation';

import { SidebarCategoryList } from './SidebarCategoryList';
import { SidebarEmptyState } from './SidebarEmptyState';
import { SidebarHeader } from './SidebarHeader';
import { getContainerStyles } from './utils/getContainerStyles';
import { getListStyles } from './utils/getListStyles';
import { useSidebarNavigationHandlers } from './utils/useSidebarNavigationHandlers';
import { useSidebarPersistence } from './utils/useSidebarPersistence';
import { useSidebarScrollGuards } from './utils/useSidebarScrollGuards';
import { useSidebarSelection } from './utils/useSidebarSelection';
import { useSidebarSelectionState } from './utils/useSidebarSelectionState';

import type { SidebarProps } from './types';
import type { ReactElement } from 'react';

// eslint-disable-next-line max-lines-per-function -- composes selection state, persistence, navigation handlers, store wiring, and the full sidebar tree
export function Sidebar({
    catalog,
    activePackageId,
    activeVersionId,
    variant = 'desktop',
    className,
    onSelect
}: SidebarProps): ReactElement {
    const pathname = usePathname();
    const containerStyles = getContainerStyles(variant);
    const listStyles = getListStyles(variant);
    const { handleWheel } = useSidebarScrollGuards();

    const {
        restSegments,
        fallbackPackageId,
        fallbackVersionId,
        effectivePackageId,
        effectiveVersionId,
        setPendingSelection
    } = useSidebarSelectionState(catalog, pathname, activePackageId, activeVersionId);

    const { scrollRef, collapsedStorageKey } = useSidebarPersistence(fallbackPackageId, fallbackVersionId);

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

    const onPackageChange = (value: string): void => {
        const nextPackage = catalog.find((entry) => entry.id === value) ?? null;
        const nextVersionId = nextPackage?.versions[0]?.id ?? null;

        setPendingSelection({ packageId: value, versionId: nextVersionId });
        handlePackageChange(value);
    };

    const onVersionChange = (value: string): void => {
        const targetPackageId = effectivePackageId || fallbackPackageId;

        if (targetPackageId) {
            setPendingSelection({ packageId: targetPackageId, versionId: value });
        }

        handleVersionChange(value);
    };

    if (!activePackage || !activeVersion) {
        return className ? <SidebarEmptyState className={cn(className)} /> : <SidebarEmptyState />;
    }

    const isDesktop = variant === 'desktop';

    return (
        <Card
            as="nav"
            size="none"
            aria-label="Library navigation"
            className={cn(
                'flex h-full flex-col p-4',
                isDesktop ? 'rounded-none border-0 bg-(--bg-surface-moderate-transparent) shadow-none' : 'bg-surface',
                className
            )}
            style={containerStyles}
        >
            <div className={cn('shrink-0 space-y-3')}>
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
                className={cn('nice-scroll relative mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pe-1')}
                style={listStyles}
                onWheel={handleWheel}
            >
                <SidebarCategoryList
                    categories={activeVersion.categories}
                    activeHref={pathname}
                    storageKey={collapsedStorageKey}
                    {...(onSelect ? { onSelect } : {})}
                />
            </div>
        </Card>
    );
}
