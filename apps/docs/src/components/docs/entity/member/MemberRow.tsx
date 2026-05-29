import { cn } from '@seedcord/ui';

import MemberRowBody from './MemberRowBody';
import MemberRowHeader from './MemberRowHeader';
import DeprecatedEntity from '../DeprecatedEntity';
import { buildTagList } from '../utils/buildTagList';

import type { EntityMemberSummary, MemberPrefix, WithParentDeprecationStatus } from '../types';
import type { DeprecationStatus } from '@lib/docs/types';
import type { ReactElement } from 'react';

interface MemberRowProps extends WithParentDeprecationStatus {
    member: EntityMemberSummary;
    prefix: MemberPrefix;
    isLast: boolean;
}
function MemberRow({ member, prefix, isLast, parentDeprecationStatus }: MemberRowProps): ReactElement {
    const tags = buildTagList(member);
    const anchorId = `${prefix}-${member.id}`;
    const hasTags = tags.length > 0;
    const isDeprecated =
        tags.includes('deprecated') ||
        Boolean(member.tags?.includes('deprecated')) ||
        Boolean(member.deprecationStatus?.isDeprecated);

    // Prefer model-provided deprecationStatus, otherwise build one. If the member has no deprecation message
    // but the parent entity has one, prefer that message for clarity.
    let deprecationStatus: DeprecationStatus =
        member.deprecationStatus ??
        (isDeprecated
            ? { isDeprecated: true, deprecationMessage: member.description ? [member.description] : undefined }
            : { isDeprecated: false });

    if (
        deprecationStatus.isDeprecated &&
        deprecationStatus.deprecationMessage === undefined &&
        parentDeprecationStatus?.isDeprecated
    ) {
        deprecationStatus = { isDeprecated: true, deprecationMessage: parentDeprecationStatus.deprecationMessage };
    }

    return (
        <article
            id={anchorId}
            className={cn(
                'relative w-full max-w-full min-w-0 lg:scroll-mt-32',
                hasTags ? 'pt-4' : 'pt-3',
                isLast ? 'pb-4' : 'pb-6'
            )}
        >
            <DeprecatedEntity deprecationStatus={deprecationStatus}>
                <MemberRowHeader member={member} anchorId={anchorId} tags={tags} prefix={prefix} />
                <MemberRowBody member={member} parentDeprecationStatus={deprecationStatus} />
            </DeprecatedEntity>
        </article>
    );
}

export default MemberRow;
