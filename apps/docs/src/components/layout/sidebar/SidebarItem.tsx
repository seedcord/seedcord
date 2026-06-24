'use client';

import { cn } from '@seedcord/ui';
import Link from 'next/link';

import { log } from '@lib/logger';
import { getToneConfig } from '@lib/tonePresentation';

import type { SidebarItemProps } from './types';
import type { ReactElement } from 'react';

export function SidebarItem({ item, tone, isActive, onSelect }: SidebarItemProps): ReactElement {
    const toneConfig = getToneConfig(tone);
    const ItemIcon = toneConfig.icon;
    const toneStyles = toneConfig.styles;
    const { label, href } = item;

    return (
        <Link
            href={href}
            className={cn(
                'flex w-full items-center gap-2 rounded-md border border-transparent bg-transparent px-3 py-2 text-left text-sm font-medium text-(--text) transition focus-visible:outline-2 focus-visible:outline-offset-2',
                toneStyles.item,
                isActive ? toneStyles.badge : null
            )}
            onClick={() => {
                log('Sidebar item activated', { label, tone, href });
                onSelect?.();
            }}
        >
            <span className={cn('inline-flex size-6 items-center justify-center rounded-md border', toneStyles.badge)}>
                <ItemIcon size={14} strokeWidth={2} aria-hidden />
            </span>

            <span className={cn('min-w-0 truncate')}>{label}</span>
        </Link>
    );
}
