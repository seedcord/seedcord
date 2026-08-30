import { cn } from '@seedcord/ui';

import { DeprecatedEntity } from '#components/docs/entity/DeprecatedEntity';
import { buildTagList } from '#components/docs/entity/utils/buildTagList';

import { MemberRowBody } from './MemberRowBody';
import { MemberRowHeader } from './MemberRowHeader';

import type {
    EntityMemberSummary,
    MemberPrefix,
    WithParentDeprecationStatus,
    DeprecationStatus
} from '#lib/docs/types';
import type { ReactElement } from 'react';

interface MemberRowProps extends WithParentDeprecationStatus {
    member: EntityMemberSummary;
    prefix: MemberPrefix;
    isLast: boolean;
}
export function MemberRow({ member, prefix, isLast, parentDeprecationStatus }: MemberRowProps): ReactElement {
    const tags = buildTagList(member);
    const anchorId = member.id;
    const hasTags = tags.length > 0;
    const isDeprecated =
        tags.includes('deprecated') ||
        Boolean(member.tags?.includes('deprecated')) ||
        Boolean(member.deprecationStatus?.isDeprecated);

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
                <MemberRowHeader
                    member={member}
                    anchorId={anchorId}
                    tags={tags}
                    prefix={prefix}
                    isDeprecated={deprecationStatus.isDeprecated}
                />
                <MemberRowBody member={member} parentDeprecationStatus={deprecationStatus} />
            </DeprecatedEntity>
        </article>
    );
}
