'use client';

import { SegmentedControl, cn, tw, type SegmentedControlOption } from '@seedcord/ui';
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { MEMBER_ACCESS_LEVELS, formatMemberAccessLabel, type MemberAccessLevel } from '@lib/memberAccess';
import { useUIStore, type UIStore } from '@store/ui';

import type { ReactElement } from 'react';

export function MemberAccessControls({
    className,
    orientation = 'vertical',
    showLegend = true
}: {
    className?: string;
    orientation?: 'vertical' | 'horizontal';
    showLegend?: boolean;
} = {}): ReactElement {
    const { memberAccessLevel, setMemberAccessLevel } = useUIStore(
        useShallow((state: UIStore) => ({
            memberAccessLevel: state.memberAccessLevel,
            setMemberAccessLevel: state.setMemberAccessLevel
        }))
    );

    const options = useMemo<SegmentedControlOption<MemberAccessLevel>[]>(
        () => MEMBER_ACCESS_LEVELS.map((level) => ({ value: level, label: formatMemberAccessLabel(level) })),
        []
    );

    const containerClasses =
        orientation === 'horizontal' ? tw`flex items-center gap-3` : tw`flex flex-col items-stretch gap-2`;

    return (
        <div className={cn(containerClasses, className)}>
            {showLegend ? (
                <span className={cn('text-subtle text-xs font-semibold tracking-widest uppercase')}>Access</span>
            ) : null}
            <SegmentedControl
                options={options}
                value={memberAccessLevel}
                onChange={setMemberAccessLevel}
                size="sm"
                {...(showLegend ? {} : { 'aria-label': 'Member access level' })}
            />
        </div>
    );
}
