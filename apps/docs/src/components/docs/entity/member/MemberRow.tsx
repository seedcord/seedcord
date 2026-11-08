import { cn } from '@seedcord/ui';

import { DeprecatedEntity } from '#components/docs/entity/DeprecatedEntity';

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
    const anchorId = member.id;
    let deprecationStatus: DeprecationStatus = member.deprecationStatus ?? { isDeprecated: false };

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
            className={cn('relative w-full max-w-full min-w-0 pt-3 lg:scroll-mt-32', isLast ? 'pb-4' : 'pb-6')}
        >
            <DeprecatedEntity deprecationStatus={deprecationStatus}>
                <MemberRowHeader
                    member={member}
                    anchorId={anchorId}
                    prefix={prefix}
                    isDeprecated={deprecationStatus.isDeprecated}
                />
                <MemberRowBody member={member} parentDeprecationStatus={deprecationStatus} />
            </DeprecatedEntity>
        </article>
    );
}
