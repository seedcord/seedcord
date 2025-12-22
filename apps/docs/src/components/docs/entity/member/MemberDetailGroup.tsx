'use client';

import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@lib/utils';
import Icon from '@ui/Icon';

import { MEMBER_HEADER_ICONS, MEMBER_TITLES } from '../constants';
import MemberCard from './MemberCard';

import type { EntityMemberSummary, MemberPrefix, WithParentDeprecationStatus } from '../types';
import type { ReactElement } from 'react';

interface MemberDetailGroupProps extends WithParentDeprecationStatus {
    items: readonly EntityMemberSummary[];
    prefix: MemberPrefix;
    title?: string | undefined;
}

function MemberDetailGroup({
    items,
    prefix,
    title: titleProp,
    parentDeprecationStatus
}: MemberDetailGroupProps): ReactElement | null {
    const title = titleProp ?? MEMBER_TITLES[prefix];
    const panelId = `${prefix}-member-panel`;
    const [expanded, setExpanded] = useState(true);

    if (!items.length) {
        return null;
    }

    return (
        <section className="min-w-0 space-y-4" data-member-group={prefix}>
            <header>
                <button
                    type="button"
                    onClick={() => {
                        setExpanded((previous) => !previous);
                    }}
                    className="hover:border-border/60 hover:bg-surface-94 flex w-full items-center justify-between gap-3 rounded-xl border border-transparent px-3 py-2 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in_oklab,var(--accent-b)_48%,var(--text))]"
                    aria-expanded={expanded}
                    aria-controls={panelId}
                >
                    <span className="flex items-center gap-2 text-lg font-semibold text-(--text)">
                        <Icon icon={MEMBER_HEADER_ICONS[prefix]} size={18} aria-hidden />
                        {title}
                    </span>
                    <Icon
                        icon={ChevronDown}
                        size={18}
                        className={cn(
                            'text-subtle transition-transform duration-200',
                            expanded ? 'rotate-0' : '-rotate-90'
                        )}
                        aria-hidden
                    />
                </button>
            </header>
            <div
                id={panelId}
                className={cn(
                    'divide-border/70 border-border/70 divide-y border-t',
                    expanded ? 'flex min-w-0 flex-col' : 'hidden'
                )}
            >
                {items.map((item, index) => (
                    <MemberCard
                        key={item.id}
                        member={item}
                        prefix={prefix}
                        isLast={index === items.length - 1}
                        parentDeprecationStatus={parentDeprecationStatus}
                    />
                ))}
            </div>
        </section>
    );
}

export default MemberDetailGroup;
