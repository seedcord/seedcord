import { ReflectionKind } from 'typedoc';

type ReflectionKindWithSingular = typeof ReflectionKind & {
    singularString?: (value: ReflectionKind) => string;
};

export function kindLabel(kind: ReflectionKind): string {
    const singular = (ReflectionKind as ReflectionKindWithSingular).singularString;
    if (typeof singular === 'function') {
        return singular(kind);
    }

    const fallback = ReflectionKind[kind];
    return typeof fallback === 'string' ? fallback : `#${kind}`;
}

const KIND_LABEL_PREFIX = 'kind_';

export function kindKey(kind: ReflectionKind): string {
    const label = kindLabel(kind);
    return label.startsWith(KIND_LABEL_PREFIX) ? label.slice(KIND_LABEL_PREFIX.length) : label;
}

export function kindName(kind: ReflectionKind): string {
    const key = kindKey(kind);
    return key.replace(/_([a-z])/g, (_match: string, group: string) => group.toUpperCase());
}
