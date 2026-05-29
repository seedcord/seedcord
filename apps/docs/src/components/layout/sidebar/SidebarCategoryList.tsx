'use client';

import { Disclosure, DisclosureChevron, DisclosurePanel, DisclosureTrigger, cn, Icon } from '@seedcord/ui';

import { getToneConfig } from '@lib/entityMetadata';

import SidebarItem from './SidebarItem';

import type { SidebarCategoryListProps } from './types';
import type { ReactElement } from 'react';

interface SidebarCategoryProps {
    category: SidebarCategoryListProps['categories'][number];
    categoryKey: string;
    storageKey?: string;
    activeHref: string;
    onSelect?: () => void;
}

function SidebarCategory({
    category,
    categoryKey,
    storageKey,
    activeHref,
    onSelect
}: SidebarCategoryProps): ReactElement {
    const toneConfig = getToneConfig(category.tone);
    const toneStyles = toneConfig.styles;
    const ToneIcon = toneConfig.icon;
    const perCategoryStorageKey = storageKey !== undefined ? `${storageKey}:${categoryKey}` : undefined;

    return (
        <Disclosure
            defaultOpen
            className={cn('space-y-3')}
            {...(perCategoryStorageKey !== undefined && { storageKey: perCategoryStorageKey })}
        >
            <DisclosureTrigger className={cn('px-1 text-xs font-semibold tracking-wide uppercase', toneStyles.heading)}>
                <span className={cn('flex items-center gap-2')}>
                    <Icon icon={ToneIcon} size={16} />
                    <span>{category.title}</span>
                </span>
                <DisclosureChevron className={cn('ml-2')} />
            </DisclosureTrigger>
            <DisclosurePanel>
                <div className={cn('flex flex-col gap-1 pt-3')}>
                    {category.items.map((item) => (
                        <SidebarItem
                            key={`${category.title}-${item.href}`}
                            item={item}
                            tone={category.tone}
                            isActive={item.href === activeHref}
                            {...(onSelect ? { onSelect } : {})}
                        />
                    ))}
                </div>
            </DisclosurePanel>
        </Disclosure>
    );
}

function SidebarCategoryList({ categories, activeHref, storageKey, onSelect }: SidebarCategoryListProps): ReactElement {
    return (
        <div className={cn('flex flex-col gap-6 pr-1 pb-2')}>
            {categories.map((category) => (
                <SidebarCategory
                    key={`${category.title}-${category.tone}`}
                    categoryKey={`${category.title}-${category.tone}`}
                    category={category}
                    activeHref={activeHref}
                    {...(storageKey !== undefined && { storageKey })}
                    {...(onSelect ? { onSelect } : {})}
                />
            ))}
        </div>
    );
}

export default SidebarCategoryList;
