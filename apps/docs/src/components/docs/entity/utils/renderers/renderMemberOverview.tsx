import { ChevronDown } from 'lucide-react';

import { formatMemberAccessLabel } from '@lib/memberAccess';
import { cn } from '@lib/utils';
import Icon from '@ui/Icon';

import type { MemberAccessLevel } from '@lib/memberAccess';
import type { ReactElement } from 'react';

export function renderMemberOverview(
    columns: ReactElement[],
    memberAccessLevel: MemberAccessLevel,
    showAccessControls = false
): ReactElement | null {
    if (!columns.length) {
        return null;
    }

    const quickPanelGridColumns = columns.length === 2 ? 'lg:grid-cols-2' : undefined;

    return (
        <details open className="group card bg-surface-97 shadow-soft min-w-0 p-4 md:p-5">
            <summary className="flex cursor-pointer items-center justify-between gap-3 text-left text-(--text)">
                <span className="text-lg font-semibold">Member overview</span>
                <Icon icon={ChevronDown} size={18} className="text-subtle transition-transform group-open:rotate-180" />
            </summary>
            <div className="mt-3 space-y-4">
                {showAccessControls ? (
                    <p className="text-subtle text-xs">
                        Showing members with{' '}
                        <span className="font-semibold text-(--text)">
                            {formatMemberAccessLabel(memberAccessLevel)}
                        </span>{' '}
                        visibility and higher.
                    </p>
                ) : null}
                <div className={cn('grid min-w-0 gap-3', quickPanelGridColumns)}>{columns}</div>
            </div>
        </details>
    );
}
