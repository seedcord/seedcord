'use client';

import { Card, Disclosure, DisclosureChevron, DisclosurePanel, DisclosureTrigger, cn, tw } from '@seedcord/ui';

import { formatMemberAccessLabel } from '@lib/memberAccess';

import type { MemberAccessLevel } from '@lib/memberAccess';
import type { ReactElement } from 'react';

interface MemberOverviewProps {
    columns: ReactElement[];
    memberAccessLevel: MemberAccessLevel;
    showAccessControls?: boolean;
}

export function MemberOverview({
    columns,
    memberAccessLevel,
    showAccessControls = false
}: MemberOverviewProps): ReactElement | null {
    if (!columns.length) {
        return null;
    }

    const quickPanelGridColumns = columns.length === 2 ? tw`lg:grid-cols-2` : undefined;

    return (
        <Card size="md" className={cn('group min-w-0 md:p-5')}>
            <Disclosure defaultOpen>
                <DisclosureTrigger className={cn('hover:bg-surface-strong rounded-lg py-1 text-(--text)')}>
                    <span className={cn('text-lg font-semibold')}>Member overview</span>
                    <DisclosureChevron size={18} className={cn('ml-auto')} />
                </DisclosureTrigger>
                <DisclosurePanel className={cn('min-w-0')}>
                    <div className={cn('pt-3')}>
                        {showAccessControls ? (
                            <p className={cn('text-subtle mb-3 text-xs')}>
                                Showing members with{' '}
                                <span className={cn('font-semibold text-(--text)')}>
                                    {formatMemberAccessLabel(memberAccessLevel)}
                                </span>{' '}
                                visibility and higher.
                            </p>
                        ) : null}
                        <div className={cn('grid min-w-0 gap-3', quickPanelGridColumns)}>{columns}</div>
                    </div>
                </DisclosurePanel>
            </Disclosure>
        </Card>
    );
}
