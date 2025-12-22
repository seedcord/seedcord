'use client';

import { useMemo } from 'react';

import { formatEntityKindLabel, resolveEntityTone } from '@lib/entityMetadata';

import type { EntityTone } from '@lib/entityMetadata';

function inferToneFromSymbol(symbolName?: string | null): EntityTone | null {
    if (!symbolName) {
        return null;
    }

    if (/^[A-Z0-9_]+$/u.test(symbolName)) {
        return 'variable';
    }

    if (/(Enum|Status|Mode|Level|State)$/u.test(symbolName)) {
        return 'enum';
    }

    if (/(Options|Config|Params|Context|Metadata)$/u.test(symbolName)) {
        return 'interface';
    }

    if (/(Hook|Schema|Result|Payload|Type)$/u.test(symbolName)) {
        return 'type';
    }

    if (/^use[A-Z]/u.test(symbolName) || /^[a-z]/u.test(symbolName)) {
        return 'function';
    }

    return null;
}

export function useEntityTone(kind: string, symbolName?: string): { tone: EntityTone; badgeLabel: string } {
    const tone = useMemo(() => {
        const resolved = resolveEntityTone(kind);

        if (kind && resolved !== 'class') {
            return resolved;
        }

        return inferToneFromSymbol(symbolName) ?? resolved;
    }, [kind, symbolName]);

    const badgeLabel = useMemo(() => formatEntityKindLabel(tone), [tone]);

    return { tone, badgeLabel };
}
