import type { ApiItem } from '@microsoft/api-extractor-model';

export const DocKind = {
    Project: 1,
    Module: 2,
    Namespace: 4,
    Enum: 8,
    EnumMember: 16,
    Variable: 32,
    Function: 64,
    Class: 128,
    Interface: 256,
    Constructor: 512,
    Property: 1024,
    Method: 2048,
    CallSignature: 4096,
    IndexSignature: 8192,
    ConstructorSignature: 16384,
    Parameter: 32768,
    TypeLiteral: 65536,
    TypeParameter: 131072,
    Accessor: 262144,
    GetSignature: 524288,
    SetSignature: 1048576,
    TypeAlias: 2097152,
    Reference: 4194304
} as const;

export const KIND_LABEL: Readonly<Record<number, string>> = {
    1: 'kind_project',
    2: 'kind_module',
    4: 'kind_namespace',
    8: 'kind_enum',
    16: 'kind_enum_member',
    32: 'kind_variable',
    64: 'kind_function',
    128: 'kind_class',
    256: 'kind_interface',
    512: 'kind_constructor',
    1024: 'kind_property',
    2048: 'kind_method',
    4096: 'kind_call_signature',
    8192: 'kind_index_signature',
    16384: 'kind_constructor_signature',
    32768: 'kind_parameter',
    65536: 'kind_type_literal',
    131072: 'kind_type_parameter',
    262144: 'kind_accessor',
    524288: 'kind_get_signature',
    1048576: 'kind_set_signature',
    2097152: 'kind_type_alias',
    4194304: 'kind_reference'
};

export function frozenKindLabel(kind: number): string {
    return KIND_LABEL[kind] ?? `#${kind}`;
}

/**
 * API Extractor's `ApiItemKind` → the frozen numeric kind. AE has no distinct getter/setter/accessor
 * kind (they arrive as `Property`); the adapter detects `get `/`set ` excerpt prefixes and overrides
 * to Accessor where needed, so this base map keeps Property for the plain case.
 */
const API_KIND_TO_DOC_KIND: Readonly<Record<string, number>> = {
    Class: DocKind.Class,
    Interface: DocKind.Interface,
    Enum: DocKind.Enum,
    EnumMember: DocKind.EnumMember,
    Variable: DocKind.Variable,
    Function: DocKind.Function,
    Namespace: DocKind.Namespace,
    TypeAlias: DocKind.TypeAlias,
    Method: DocKind.Method,
    MethodSignature: DocKind.Method,
    Property: DocKind.Property,
    PropertySignature: DocKind.Property,
    Constructor: DocKind.Constructor,
    ConstructSignature: DocKind.ConstructorSignature,
    CallSignature: DocKind.CallSignature,
    IndexSignature: DocKind.IndexSignature,
    Parameter: DocKind.Parameter,
    TypeParameter: DocKind.TypeParameter
};

export function apiKindToDocKind(item: ApiItem): number {
    return API_KIND_TO_DOC_KIND[item.kind] ?? DocKind.Reference;
}
