'use client';
import { ENTITY_SEGMENT_START_INDEX } from './constants';

export function resolveRestSegments(pathname: string): string[] {
    const segments = pathname.split('/').filter(Boolean);

    if (segments.length < ENTITY_SEGMENT_START_INDEX) {
        return [];
    }

    return segments.slice(ENTITY_SEGMENT_START_INDEX);
}
