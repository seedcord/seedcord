'use client';

import Link from 'next/link';

import { getToneConfig } from '@lib/entityMetadata';
import { log } from '@lib/logger';
import { cn } from '@lib/utils';

import type { SidebarItemProps } from './types';
import type { ReactElement } from 'react';

function SidebarItem({ item, tone, isActive }: SidebarItemProps): ReactElement {
    const toneConfig = getToneConfig(tone);
    const ItemIcon = toneConfig.icon;
    const toneStyles = toneConfig.styles;
    const { label, href } = item;

    return (
        <Link
            href={href}
            className={cn(
                'flex w-full items-center gap-2 rounded-lg border border-transparent bg-transparent px-3 py-2 text-left text-sm font-medium text-(--text) transition focus-visible:outline-2 focus-visible:outline-offset-2',
                toneStyles.item,
                isActive
                    ? 'border-[color-mix(in_oklab,var(--accent-b)_45%,var(--border))] bg-[color-mix(in_oklab,var(--accent-b)_14%,var(--bg)_86%)]'
                    : null
            )}
            onClick={() => {
                log('Sidebar item activated', { label, tone, href });
            }}
        >
            <span
                className={cn('inline-flex h-6 w-6 items-center justify-center rounded-full border', toneStyles.badge)}
            >
                <ItemIcon size={14} strokeWidth={2} aria-hidden />
            </span>

            <span className="min-w-0 truncate">{label}</span>
        </Link>
    );
}

export default SidebarItem;
