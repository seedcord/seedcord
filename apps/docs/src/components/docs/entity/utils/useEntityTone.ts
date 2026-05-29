'use client';

import { useMemo } from 'react';

import { formatEntityKindLabel, resolveEntityTone } from '@lib/entityMetadata';

import type { EntityTone } from '@lib/entityMetadata';

export function useEntityTone(kind: string): { tone: EntityTone; badgeLabel: string } {
    const tone = useMemo<EntityTone>(() => resolveEntityTone(kind), [kind]);
    const badgeLabel = useMemo(() => formatEntityKindLabel(tone), [tone]);
    return { tone, badgeLabel };
}
