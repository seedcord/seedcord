'use client';

import { ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';

import { getToneConfig } from '@lib/entityMetadata';
import { cn } from '@lib/utils';
import Icon from '@ui/Icon';

import SidebarItem from './SidebarItem';

import type { SidebarCategoryListProps } from './types';
import type { ReactElement } from 'react';

interface SidebarCategoryProps {
    category: SidebarCategoryListProps['categories'][number];
    categoryKey: string;
    isCollapsed: boolean;
    onToggle: (key: string) => void;
    activeHref: string;
}

function SidebarCategory({
    category,
    categoryKey,
    isCollapsed,
    onToggle,
    activeHref
}: SidebarCategoryProps): ReactElement {
    const toneConfig = getToneConfig(category.tone);
    const toneStyles = toneConfig.styles;
    const ToneIcon = toneConfig.icon;

    return (
        <div className="space-y-3">
            <button
                type="button"
                aria-expanded={!isCollapsed}
                onClick={() => onToggle(categoryKey)}
                className={cn(
                    'flex w-full items-center px-1 text-left text-xs font-semibold tracking-wide uppercase',
                    toneStyles.heading
                )}
            >
                <span className="flex items-center gap-2">
                    <Icon icon={ToneIcon} size={16} />
                    <span>{category.title}</span>
                </span>
                <Icon
                    icon={ChevronDown}
                    size={16}
                    className={cn('ml-2 transition-transform', isCollapsed && '-rotate-90')}
                />
            </button>
            <div className={cn('flex flex-col gap-1', isCollapsed && 'hidden')}>
                {category.items.map((item) => (
                    <SidebarItem
                        key={`${category.title}-${item.href}`}
                        item={item}
                        tone={category.tone}
                        isActive={item.href === activeHref}
                    />
                ))}
            </div>
        </div>
    );
}

function SidebarCategoryList({ categories, activeHref, storageKey }: SidebarCategoryListProps): ReactElement {
    // Start with an empty object so server and initial client render match.
    const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

    // After mount, read from localStorage (if available) and hydrate the state.
    useEffect(() => {
        if (!storageKey) return;

        const t = setTimeout(() => {
            try {
                const saved = window.localStorage.getItem(storageKey);
                if (saved) setCollapsedCategories(JSON.parse(saved) as Record<string, boolean>);
            } catch {
                // ignore
            }
        }, 0);

        return () => clearTimeout(t);
    }, [storageKey]);

    const toggleCategory = (key: string): void => {
        setCollapsedCategories((prev) => {
            const next = {
                ...prev,
                [key]: !prev[key]
            };
            if (storageKey && typeof window !== 'undefined') {
                window.localStorage.setItem(storageKey, JSON.stringify(next));
            }
            return next;
        });
    };

    return (
        <div className="flex flex-col gap-6 pr-1 pb-2">
            {categories.map((category) => (
                <SidebarCategory
                    key={`${category.title}-${category.tone}`}
                    categoryKey={`${category.title}-${category.tone}`}
                    category={category}
                    isCollapsed={collapsedCategories[`${category.title}-${category.tone}`] ?? false}
                    onToggle={toggleCategory}
                    activeHref={activeHref}
                />
            ))}
        </div>
    );
}

export default SidebarCategoryList;
