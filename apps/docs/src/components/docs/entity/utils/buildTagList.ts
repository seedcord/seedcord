import type { EntityMemberSummary } from '../types';

export function buildTagList(member: EntityMemberSummary): string[] {
    const collected = new Set(member.tags ?? []);

    const toRemove = new Set(['static', 'readonly', 'abstract', 'async', 'public', 'protected', 'deprecated']);

    for (const tag of Array.from(collected)) {
        if (toRemove.has(tag)) collected.delete(tag);
    }

    return Array.from(collected);
}
