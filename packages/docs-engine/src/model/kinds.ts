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
    ConstructorSignature: 16_384,
    Parameter: 32_768,
    TypeLiteral: 65_536,
    TypeParameter: 131_072,
    Accessor: 262_144,
    GetSignature: 524_288,
    SetSignature: 1_048_576,
    TypeAlias: 2_097_152,
    Reference: 4_194_304
} as const;

const KIND_LABEL: Readonly<Record<number, string>> = {
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
    16_384: 'kind_constructor_signature',
    32_768: 'kind_parameter',
    65_536: 'kind_type_literal',
    131_072: 'kind_type_parameter',
    262_144: 'kind_accessor',
    524_288: 'kind_get_signature',
    1_048_576: 'kind_set_signature',
    2_097_152: 'kind_type_alias',
    4_194_304: 'kind_reference'
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
