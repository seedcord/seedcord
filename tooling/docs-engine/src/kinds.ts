import { frozenKindLabel } from '#model/kinds';

const KIND_LABEL_PREFIX = 'kind_';

export function kindLabel(kind: number): string {
    return frozenKindLabel(kind);
}

export function kindKey(kind: number): string {
    const label = kindLabel(kind);
    return label.startsWith(KIND_LABEL_PREFIX) ? label.slice(KIND_LABEL_PREFIX.length) : label;
}

export function kindName(kind: number): string {
    const key = kindKey(kind);
    return key.replaceAll(/_([a-z])/g, (_match: string, group: string) => group.toUpperCase());
}
