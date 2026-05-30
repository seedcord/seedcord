'use client';

import { Disclosure, DisclosureChevron, DisclosurePanel, DisclosureTrigger, cn, Icon } from '@seedcord/ui';

import { MEMBER_HEADER_ICONS, MEMBER_TITLES } from '../constants';
import { MemberRow } from './MemberRow';

import type { EntityMemberSummary, MemberPrefix, WithParentDeprecationStatus } from '../types';
import type { ReactElement } from 'react';

interface MemberDetailGroupProps extends WithParentDeprecationStatus {
    items: readonly EntityMemberSummary[];
    prefix: MemberPrefix;
    title?: string | undefined;
}

export function MemberDetailGroup({
    items,
    prefix,
    title: titleProp,
    parentDeprecationStatus
}: MemberDetailGroupProps): ReactElement | null {
    const title = titleProp ?? MEMBER_TITLES[prefix];

    if (!items.length) {
        return null;
    }

    return (
        <Disclosure defaultOpen className={cn('min-w-0 space-y-4')} data-member-group={prefix}>
            <header>
                <DisclosureTrigger
                    className={cn(
                        'justify-between rounded-xl border border-transparent px-3 py-2 transition hover:bg-(--surface-moderate)'
                    )}
                >
                    <span className={cn('flex items-center gap-2 text-lg font-semibold text-(--text)')}>
                        <Icon icon={MEMBER_HEADER_ICONS[prefix]} size={18} aria-hidden />
                        {title}
                    </span>
                    <DisclosureChevron size={18} />
                </DisclosureTrigger>
            </header>
            <DisclosurePanel>
                <div className={cn('divide-border/70 border-border/70 flex min-w-0 flex-col divide-y border-t')}>
                    {items.map((item, index) => (
                        <MemberRow
                            key={item.id}
                            member={item}
                            prefix={prefix}
                            isLast={index === items.length - 1}
                            parentDeprecationStatus={parentDeprecationStatus}
                        />
                    ))}
                </div>
            </DisclosurePanel>
        </Disclosure>
    );
}
