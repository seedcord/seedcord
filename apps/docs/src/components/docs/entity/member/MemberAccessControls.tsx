'use client';

import { useContext } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { DocsUIContext } from '@components/docs/DocsUIContext';
import { MEMBER_ACCESS_LEVELS, formatMemberAccessLabel } from '@lib/memberAccess';
import { cn } from '@lib/utils';
import { useUIStore, type UIStore } from '@store/ui';

import type { ReactElement } from 'react';

function MemberAccessControls({
    className,
    orientation = 'vertical',
    showLegend = true
}: {
    className?: string;
    orientation?: 'vertical' | 'horizontal';
    showLegend?: boolean;
} = {}): ReactElement {
    const ctx = useContext(DocsUIContext);

    const { memberAccessLevel, setMemberAccessLevel } = useUIStore(
        useShallow((state: UIStore) => ({
            memberAccessLevel: state.memberAccessLevel,
            setMemberAccessLevel: state.setMemberAccessLevel
        }))
    );

    const initialLevel = ctx?.memberAccessLevel;

    const containerClasses =
        orientation === 'horizontal' ? 'flex items-center gap-3' : 'flex flex-col items-stretch gap-2';

    return (
        <div className={cn(containerClasses, className)}>
            {showLegend ? (
                <span className="text-subtle text-xs font-semibold tracking-widest uppercase">Access</span>
            ) : null}
            <div
                role="radiogroup"
                aria-label={showLegend ? undefined : 'Member access level'}
                className="border-border/60 bg-surface-97 inline-flex overflow-hidden rounded-full border"
            >
                {MEMBER_ACCESS_LEVELS.map((level, index) => {
                    const isActive = (initialLevel ?? memberAccessLevel) === level;
                    return (
                        <button
                            key={level}
                            type="button"
                            role="radio"
                            aria-checked={isActive}
                            onClick={() => setMemberAccessLevel(level)}
                            className={cn(
                                'relative px-3 py-1.5 text-xs font-medium transition-colors focus-visible:z-1 focus-visible:ring-1 focus-visible:ring-[color-mix(in_oklab,var(--accent-b)_35%,transparent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[color-mix(in_oklab,var(--surface)_98%,transparent)] focus-visible:outline-none',
                                index > 0 && 'border-border/50 border-l',
                                isActive
                                    ? 'bg-[color-mix(in_oklab,var(--accent-b)_15%,var(--surface)_85%)] text-[color-mix(in_oklab,var(--text)_92%,var(--accent-b)_8%)]'
                                    : 'text-subtle hover:text-(--text)'
                            )}
                        >
                            {formatMemberAccessLabel(level)}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export default MemberAccessControls;
