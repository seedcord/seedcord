'use client';

import { cn } from '@seedcord/ui';
import { useMemo, type ReactElement } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { MemberAccessControls } from '@components/docs/entity/member/MemberAccessControls';
import { useUIStore, type UIStore } from '@store/ui';

import { MemberDetailGroup } from './member/MemberDetailGroup';
import { MemberList } from './member/MemberList';
import { MemberOverview } from './member/MemberOverview';
import { shouldIncludeMember } from './utils/shouldIncludeMember';
import { useMemberNavigation } from './utils/useMemberNavigation';

import type { EntityMemberSummary, WithParentDeprecationStatus } from '@lib/docs/types';

const EMPTY_MEMBERS: readonly EntityMemberSummary[] = [];

interface EntityMembersSectionProps extends WithParentDeprecationStatus {
    properties: readonly EntityMemberSummary[];
    methods: readonly EntityMemberSummary[];
    typeParameters?: readonly EntityMemberSummary[];
    constructors?: readonly EntityMemberSummary[];
    showAccessControls?: boolean;
}

export function EntityMembersSection({
    properties,
    methods,
    constructors = EMPTY_MEMBERS,
    typeParameters = EMPTY_MEMBERS,
    showAccessControls = false,
    parentDeprecationStatus
}: EntityMembersSectionProps): ReactElement {
    const memberAccessLevel = useUIStore(useShallow((state: UIStore) => state.memberAccessLevel));
    const openMemberSection = useMemberNavigation();

    const filteredProperties = useMemo(
        () => properties.filter((member) => shouldIncludeMember(member, memberAccessLevel)),
        [properties, memberAccessLevel]
    );
    const filteredMethods = useMemo(
        () => methods.filter((member) => shouldIncludeMember(member, memberAccessLevel)),
        [methods, memberAccessLevel]
    );
    const filteredConstructors = useMemo(
        () => constructors.filter((member) => shouldIncludeMember(member, memberAccessLevel)),
        [constructors, memberAccessLevel]
    );
    const quickPanelColumns: ReactElement[] = [
        <MemberList key="properties" items={filteredProperties} prefix="property" onNavigate={openMemberSection} />,
        <MemberList key="methods" items={filteredMethods} prefix="method" onNavigate={openMemberSection} />
    ];

    return (
        <section className={cn('min-w-0 space-y-8')}>
            {showAccessControls ? (
                <div className={cn('flex flex-wrap items-center justify-between gap-3')}>
                    <div className={cn('space-y-0.5')}>
                        <p className={cn('text-subtle text-xs font-semibold tracking-widest uppercase')}>
                            Member visibility
                        </p>
                        <p className={cn('text-subtle/80 text-xs')}>Filter class members by access level.</p>
                    </div>
                    <MemberAccessControls orientation="horizontal" showLegend={false} className={cn('shrink-0')} />
                </div>
            ) : null}
            <MemberDetailGroup
                items={filteredConstructors}
                prefix="constructor"
                parentDeprecationStatus={parentDeprecationStatus}
            />
            <MemberOverview
                columns={quickPanelColumns}
                memberAccessLevel={memberAccessLevel}
                showAccessControls={showAccessControls}
            />

            <div className={cn('min-w-0 space-y-8')}>
                <MemberDetailGroup
                    items={typeParameters}
                    prefix="typeParameter"
                    parentDeprecationStatus={parentDeprecationStatus}
                />
                <MemberDetailGroup
                    items={filteredProperties}
                    prefix="property"
                    parentDeprecationStatus={parentDeprecationStatus}
                />
                <MemberDetailGroup
                    items={filteredMethods}
                    prefix="method"
                    parentDeprecationStatus={parentDeprecationStatus}
                />
            </div>
        </section>
    );
}
