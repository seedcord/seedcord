'use client';

import { cn } from '@seedcord/ui';
import Link from 'next/link';

import { MEMBER_TITLES } from '@components/docs/entity/constants';

import type { EntityMemberSummary, MemberPrefix } from '@lib/docs/types';
import type { ReactElement } from 'react';

interface MemberListProps {
    items: readonly EntityMemberSummary[];
    prefix: MemberPrefix;
    onNavigate: (anchorId: string) => void;
}

export function MemberList({ items, prefix, onNavigate }: MemberListProps): ReactElement | null {
    if (!items.length) {
        return null;
    }

    const title = MEMBER_TITLES[prefix];

    return (
        <section className={cn('min-w-0 space-y-2.5')} aria-labelledby={`${prefix}-list-heading`}>
            <h2
                id={`${prefix}-list-heading`}
                className={cn('text-subtle text-xs font-semibold tracking-widest uppercase')}
            >
                {title}
            </h2>
            <ul className={cn('space-y-2')}>
                {items.map((item) => (
                    <li key={item.id} className={cn('min-w-0')}>
                        <Link
                            href={`#${item.id}`}
                            onClick={() => {
                                onNavigate(item.id);
                            }}
                            className={cn(
                                'group bg-surface-subtle flex w-full min-w-0 items-center justify-between rounded-lg border border-(--border)/70 px-3.5 py-2 text-sm text-(--text)',
                                'hover:border-(--border-accent-b-subtle)',
                                'hover:bg-(--surface-accent-b-moderate)'
                            )}
                        >
                            <span className={cn('truncate font-medium')}>
                                {prefix === 'method' ? `${item.label}()` : item.label}
                            </span>
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    );
}
