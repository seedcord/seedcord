'use client';

import { useContext, useMemo, type ReactElement } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { DocsUIContext } from '@components/docs/DocsUIContext';
import MemberAccessControls from '@components/docs/entity/member/MemberAccessControls';
import { useUIStore, type UIStore } from '@store/ui';

import MemberDetailGroup from './member/MemberDetailGroup';
import MemberList from './member/MemberList';
import { renderMemberOverview } from './utils/renderers/renderMemberOverview';
import { shouldIncludeMember } from './utils/shouldIncludeMember';
import { useMemberNavigation } from './utils/useMemberNavigation';

import type { EntityMemberSummary, WithParentDeprecationStatus } from './types';

export interface EntityMembersSectionProps extends WithParentDeprecationStatus {
    properties: readonly EntityMemberSummary[];
    methods: readonly EntityMemberSummary[];
    typeParameters?: readonly EntityMemberSummary[];
    constructors?: readonly EntityMemberSummary[];
    showAccessControls?: boolean;
}

function EntityMembersSection({
    properties,
    methods,
    constructors = [],
    typeParameters = [],
    showAccessControls = false,
    parentDeprecationStatus
}: EntityMembersSectionProps): ReactElement {
    const ctx = useContext(DocsUIContext);
    const memberAccessLevel = useUIStore(useShallow((state: UIStore) => state.memberAccessLevel));

    const effectiveMemberAccessLevel = ctx?.memberAccessLevel ?? memberAccessLevel;
    const openMemberSection = useMemberNavigation();

    const filteredProperties = useMemo(
        () => properties.filter((member) => shouldIncludeMember(member, effectiveMemberAccessLevel)),
        [properties, effectiveMemberAccessLevel]
    );
    const filteredMethods = useMemo(
        () => methods.filter((member) => shouldIncludeMember(member, effectiveMemberAccessLevel)),
        [methods, effectiveMemberAccessLevel]
    );
    const filteredConstructors = useMemo(
        () => constructors.filter((member) => shouldIncludeMember(member, effectiveMemberAccessLevel)),
        [constructors, effectiveMemberAccessLevel]
    );
    const quickPanelColumns: ReactElement[] = [
        <MemberList key="properties" items={filteredProperties} prefix="property" onNavigate={openMemberSection} />,
        <MemberList key="methods" items={filteredMethods} prefix="method" onNavigate={openMemberSection} />
    ];

    return (
        <section className="min-w-0 space-y-8">
            {showAccessControls ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-0.5">
                        <p className="text-subtle text-xs font-semibold tracking-widest uppercase">Member visibility</p>
                        <p className="text-subtle/80 text-xs">Filter class members by access level.</p>
                    </div>
                    <MemberAccessControls orientation="horizontal" showLegend={false} className="shrink-0" />
                </div>
            ) : null}
            <MemberDetailGroup
                items={filteredConstructors}
                prefix="constructor"
                parentDeprecationStatus={parentDeprecationStatus}
            />
            {renderMemberOverview(quickPanelColumns, effectiveMemberAccessLevel, showAccessControls)}

            <div className="min-w-0 space-y-8">
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

export default EntityMembersSection;
