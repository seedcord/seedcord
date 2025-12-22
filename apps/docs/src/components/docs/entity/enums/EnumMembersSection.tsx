import { cn } from '@lib/utils';

import EnumMemberCard from './EnumMemberCard';

import type { EnumMemberModel } from '@lib/docs/types';
import type { ReactElement } from 'react';

interface EnumMembersSectionProps {
    members: readonly EnumMemberModel[];
}

function EnumMembersSection({ members }: EnumMembersSectionProps): ReactElement | null {
    if (!members.length) {
        return null;
    }

    return (
        <section className="space-y-4">
            <header className="space-y-1">
                <h2 className="text-xl font-semibold text-[color-mix(in_oklab,var(--entity-enum-color)_72%,var(--text))]">
                    Members
                </h2>
            </header>
            <div className={cn('grid gap-4', members.length > 1 ? 'lg:grid-cols-2' : undefined)}>
                {members.map((member) => (
                    <EnumMemberCard key={member.id} member={member} />
                ))}
            </div>
        </section>
    );
}

export default EnumMembersSection;
