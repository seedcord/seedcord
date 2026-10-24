import type { ScoredEntry } from '#src/DocSearch';

export type SearchResultKind =
    | 'package'
    | 'page'
    | 'resource'
    | 'class'
    | 'interface'
    | 'type'
    | 'enum'
    | 'function'
    | 'constructor'
    | 'method'
    | 'property'
    | 'variable'
    | 'parameter'
    | 'typeParameter'
    | 'enumMember';

export const KIND_FILTERS = [
    { value: 'all', label: 'All kinds' },
    { value: 'class', label: 'Classes' },
    { value: 'interface', label: 'Interfaces' },
    { value: 'type', label: 'Types' },
    { value: 'enum', label: 'Enums' },
    { value: 'function', label: 'Functions' },
    { value: 'variable', label: 'Variables' },
    { value: 'member', label: 'Members' }
] as const;

export type KindFilter = (typeof KIND_FILTERS)[number]['value'];

export interface SearchAction {
    id: string;
    label: string;
    path: string;
    href: string;
    kind: SearchResultKind;
    description?: string;
    value?: string;
}

export interface SearchViewedPackage {
    pkg: string;
    version: string | null;
}

export interface SearchIndexEntry extends ScoredEntry {
    action: SearchAction;
}

export interface ReferenceSearchResult extends SearchIndexEntry {
    url: string;
}

export interface SearchPackage {
    id: string;
    label: string;
    fullName: string;
    stable: string | null;
    prerelease: string | null;
}
