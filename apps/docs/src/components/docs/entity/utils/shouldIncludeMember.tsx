import { rankOfAccess, type MemberAccessLevel } from '@lib/memberAccess';

import type { EntityMemberSummary } from '../types';

export function shouldIncludeMember(member: EntityMemberSummary, threshold: MemberAccessLevel): boolean {
    const access = member.access ?? 'public';
    return rankOfAccess(access) <= rankOfAccess(threshold);
}
