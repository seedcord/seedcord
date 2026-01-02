'use client';

import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

import { formatMemberAccessLabel } from '@lib/memberAccess';
import { cn } from '@lib/utils';
import Icon from '@ui/Icon';

import type { MemberAccessLevel } from '@lib/memberAccess';
import type { ReactElement } from 'react';

interface MemberOverviewProps {
    columns: ReactElement[];
    memberAccessLevel: MemberAccessLevel;
    showAccessControls?: boolean;
}

function MemberOverview({
    columns,
    memberAccessLevel,
    showAccessControls = false
}: MemberOverviewProps): ReactElement | null {
    const [expanded, setExpanded] = useState(true);

    if (!columns.length) {
        return null;
    }

    const quickPanelGridColumns = columns.length === 2 ? 'lg:grid-cols-2' : undefined;

    return (
        <div className="group card bg-surface-subtle shadow-soft min-w-0 p-4 md:p-5">
            <button
                type="button"
                onClick={() => setExpanded((prev) => !prev)}
                className="hover:bg-surface-strong flex w-full cursor-pointer items-center gap-2 rounded-lg py-1 text-left text-(--text) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--outline-accent-b-moderate)"
                aria-expanded={expanded}
            >
                <span className="text-lg font-semibold">Member overview</span>
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
            <div
                className={cn(
                    'min-w-0 transition-all duration-300 ease-in-out',
                    expanded ? 'mt-3 opacity-100' : 'mt-0 hidden opacity-0'
                )}
            >
                {showAccessControls ? (
                    <p className="text-subtle mb-3 text-xs">
                        Showing members with{' '}
                        <span className="font-semibold text-(--text)">
                            {formatMemberAccessLabel(memberAccessLevel)}
                        </span>{' '}
                        visibility and higher.
                    </p>
                ) : null}
                <div className={cn('grid min-w-0 gap-3', quickPanelGridColumns)}>{columns}</div>
            </div>
        </div>
    );
}

export default MemberOverview;
