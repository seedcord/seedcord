import type {
    DocsCatalog,
    PackageCatalogEntry,
    NavigationCategory,
    NavigationEntityItem,
    PackageVersionCatalog
} from '@lib/docs/types';
import type { EntityTone } from '@lib/entityMetadata';

export type SidebarVariant = 'desktop' | 'mobile';

export type SidebarCatalog = DocsCatalog;

export interface SidebarProps {
    catalog: readonly PackageCatalogEntry[];
    activePackageId: string;
    activeVersionId: string;
    variant?: SidebarVariant;
    className?: string;
}

export interface SidebarCategoryListProps {
    categories: readonly NavigationCategory[];
    activeHref: string;
    storageKey?: string;
}

export interface SidebarItemProps {
    item: NavigationEntityItem;
    tone: EntityTone;
    isActive: boolean;
}

export type SidebarHeaderPackageOption = PackageCatalogEntry;
export type SidebarHeaderVersionOption = PackageVersionCatalog;
