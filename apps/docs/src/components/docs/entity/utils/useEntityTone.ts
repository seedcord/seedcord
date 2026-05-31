'use client';

import { formatEntityKindLabel, resolveEntityTone } from '@seedcord/docs-engine/client';

import type { EntityTone } from '@seedcord/docs-engine/client';

export function useEntityTone(kind: string): { tone: EntityTone; badgeLabel: string } {
    const tone = resolveEntityTone(kind);
    const badgeLabel = formatEntityKindLabel(tone);
    return { tone, badgeLabel };
}
