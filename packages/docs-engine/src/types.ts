import type { PackageDirectory } from './directory';
import type { GlobalId } from './ids';
import type { JSONOutput, ProjectReflection, ReflectionKind, VarianceModifier } from 'typedoc';

export type SigPart =
    | { kind: 'text'; text: string }
    | { kind: 'punct'; text: string }
    | { kind: 'space' }
    | { kind: 'ref'; text: string; ref: DocReference };

export interface InlineType {
    parts: SigPart[];
}

export interface RenderedSignature {
    name: SigPart[];
    typeParams?: {
        name: string;
        constraint?: InlineType;
        default?: InlineType;
    }[];
    parameters: {
        name: string;
        optional: boolean;
        type?: InlineType;
        defaultValue?: string;
    }[];
    returnType?: InlineType;
}

export interface RenderedDeclarationHeader {
    name: string;
    modifiers: string[];
    keyword?: string | null;
    typeParams?: {
        name: string;
        constraint?: InlineType;
        default?: InlineType;
    }[];
    type?: InlineType;
    value?: InlineType;
    heritage?: {
        extends?: InlineType[];
        implements?: InlineType[];
    };
}

export interface DocManifestPackage {
    name: string;
    version: string;
    entryPoints: string[];
    output: string | null;
    warnings: string[];
    errors: string[];
    warningCount: number;
    errorCount: number;
    succeeded: boolean;
}

export interface DocManifest {
    generatedAt: string;
    tool: string;
    typedocVersion: string;
    outputDir: string;
    repository?: {
        url: string;
        branch?: string;
        commit?: string;
    };
    packages: DocManifestPackage[];
}

export interface DocReference {
    name: string;
    targetKey?: GlobalId;
    qualifiedName?: string;
    packageName?: string;
    externalUrl?: string;
}

export interface DocCommentBlockTag {
    tag: string;
    text: string;
    name?: string;
    content: JSONOutput.CommentDisplayPart[];
}

export interface DocCommentExample {
    caption?: string;
    content: string;
    language?: string;
}

export interface DocComment {
    summary: string;
    summaryParts: JSONOutput.CommentDisplayPart[];
    blockTags: DocCommentBlockTag[];
    modifierTags: string[];
    examples: DocCommentExample[];
}

export interface DocFlags {
    access: 'public' | 'protected' | 'private' | null;
    accessor: 'getter' | 'setter' | 'getter-setter' | null;
    isStatic: boolean;
    isAbstract: boolean;
    isConst: boolean;
    isReadonly: boolean;
    isOptional: boolean;
    isAsync: boolean;
    isDeprecated: boolean;
    isInherited: boolean;
    isDecorator: boolean;
    isInternal: boolean;
    isExternal: boolean;
    isOverwriting: boolean;
}

export interface DocSource {
    fileName: string;
    line: number;
    character: number;
    url?: string;
}

export type DocType = JSONOutput.SomeType;

export interface DocTypeParameter {
    id: number;
    name: string;
    constraint?: DocType | null;
    default?: DocType | null;
    variance?: VarianceModifier;
    comment?: DocComment | null;
    flags: {
        isOptional: boolean;
    };
}

export interface DocSignatureParameter {
    id: number;
    name: string;
    kind: ReflectionKind;
    type?: DocType | null;
    defaultValue?: string;
    comment?: DocComment | null;
    flags: DocFlags;
}

export interface DocSignature {
    id?: number;
    name: string;
    kind: ReflectionKind;
    fragment: string;
    anchor: string;
    overloadIndex: number;
    kindLabel: string;
    flags: DocFlags;
    type?: DocType | null;
    parameters: DocSignatureParameter[];
    typeParameters: DocTypeParameter[];
    comment?: DocComment | null;
    returnsComment?: DocCommentBlockTag | null;
    throws?: DocCommentBlockTag[];
    sources: DocSource[];
    sourceUrl?: string;
    overwrites?: DocReference | null;
    inheritedFrom?: DocReference | null;
    implementationOf?: DocReference | null;
    render?: RenderedSignature;
    renderText?: string;
}

export interface DocGroup {
    title: string;
    kind: ReflectionKind | null;
    childKeys: GlobalId[];
}

export interface DocInheritance {
    extends?: DocType[];
    implements?: DocType[];
    extendedBy?: DocType[];
    implementedBy?: DocType[];
}

export interface SourcePackage {
    name: string;
    version: string;
}

export interface DocNode {
    id: number;
    key: GlobalId;
    packageName: string;
    sourcePackage: SourcePackage;
    packageVersion?: string;
    name: string;
    path: string[];
    qualifiedName: string;
    slug: string;
    kind: ReflectionKind;
    kindLabel: string;
    flags: DocFlags;
    comment?: DocComment | null;
    type?: DocType | null;
    typeParameters: DocTypeParameter[];
    defaultValue?: string;
    signatures: DocSignature[];
    children: DocNode[];
    groups: DocGroup[];
    sources: DocSource[];
    sourceUrl?: string;
    inheritance: DocInheritance;
    overwrites?: DocReference | null;
    inheritedFrom?: DocReference | null;
    implementationOf?: DocReference | null;
    header?: RenderedDeclarationHeader;
    headerText?: string;
}

export interface DocSearchEntry {
    slug: string;
    name: string;
    qualifiedName: string;
    packageName: string;
    packageVersion?: string;
    kind: ReflectionKind;
    summary: string | null;
    aliases?: string[];
    file?: string;
    tokens: string[];
}

export interface DocIndexes {
    byId: Map<number, DocNode>;
    bySlug: Map<string, DocNode>;
    byQName: Map<string, DocNode>;
    byKind: Map<ReflectionKind, DocNode[]>;
    search: DocSearchEntry[];
}

export interface DocPackageModel {
    manifest: DocManifestPackage;
    project: ProjectReflection;
    root: DocNode;
    nodes: Map<number, DocNode>;
    indexes: DocIndexes;
    directory: PackageDirectory;
}

export interface DocCollection {
    manifest: DocManifest;
    packages: DocPackageModel[];
    byKey: Map<GlobalId, DocNode>;
    byGlobalSlug: Map<string, DocNode>;
}
