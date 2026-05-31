import type {
    PackageCatalogEntry,
    NavigationCategory,
    NavigationEntityItem,
    PackageVersionCatalog
} from '@lib/docs/types';
import type { EntityTone } from '@seedcord/docs-engine/client';

export type SidebarVariant = 'desktop' | 'mobile';

export interface SidebarProps {
    catalog: readonly PackageCatalogEntry[];
    activePackageId: string;
    activeVersionId: string;
    variant?: SidebarVariant;
    className?: string;
    onSelect?: () => void;
}

export interface SidebarCategoryListProps {
    categories: readonly NavigationCategory[];
    activeHref: string;
    storageKey?: string;
    onSelect?: () => void;
}

export interface SidebarItemProps {
    item: NavigationEntityItem;
    tone: EntityTone;
    isActive: boolean;
    onSelect?: () => void;
}

export type SidebarHeaderPackageOption = PackageCatalogEntry;
export type SidebarHeaderVersionOption = PackageVersionCatalog;
