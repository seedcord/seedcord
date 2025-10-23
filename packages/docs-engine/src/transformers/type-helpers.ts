import { Serializer } from 'typedoc';

import type { DocType } from '../types';
import type { ReflectionType, SomeType } from 'typedoc';

const serializer = new Serializer();

export const typeToken = (type: SomeType | ReflectionType | undefined): string => {
    if (!type) return 't';

    try {
        const serialized = serializer.toObject(type) as { type?: unknown };
        const primitive = serialized.type;
        if (typeof primitive === 'string' && primitive.length > 0) return primitive;
    } catch {
        // ignore
    }

    return 't';
};

export const toDocType = (type: SomeType | ReflectionType | undefined): DocType | null => {
    if (!type) return null;

    try {
        return serializer.toObject(type);
    } catch {
        return type as unknown as DocType;
    }
};

interface ReferenceTypeLike {
    type?: string;
    package?: string;
    packageName?: string;
}

interface SourceRefLike {
    fileName?: string;
    fullFileName?: string;
}

export function hasVariant(x: unknown): x is { variant?: string } {
    return !!x && typeof x === 'object' && 'variant' in x;
}

export function hasRefType(x: unknown): x is { type?: ReferenceTypeLike } {
    return !!x && typeof x === 'object' && 'type' in x;
}

export function hasSources(x: unknown): x is { sources?: SourceRefLike[] } {
    return !!x && typeof x === 'object' && 'sources' in x;
}
