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

export interface CommandAction {
    id: string;
    label: string;
    path: string;
    href: string;
    kind: SearchResultKind;
    description?: string;
    isExternal?: boolean;
}
