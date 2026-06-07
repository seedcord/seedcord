import type {
    ManifestRepository,
    PackageSourceIndex,
    ReexportEntry as DocReexport,
    SourceEntry as ManifestSourceEntry
} from '@seedcord/docs-generator';
import type { GlobalId } from '@src/ids';
import type { PackageDirectory } from '@src/PackageDirectory';

export type { DocReexport, ManifestRepository, ManifestSourceEntry, PackageSourceIndex };

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
    sources?: PackageSourceIndex;
    reexports?: DocReexport[];
    readme?: string;
}

export interface DocManifest {
    generatedAt: string;
    tool: string;
    apiExtractorVersion: string;
    outputDir: string;
    repository?: ManifestRepository;
    packages: DocManifestPackage[];
}

export interface DocReference {
    name: string;
    targetKey?: GlobalId;
    qualifiedName?: string;
    packageName?: string;
    externalUrl?: string;
}

// Defined in the engine, structurally identical to the parts the comment renderers in apps/docs consume.
// The adapter emits a pre-resolved `DocReference` here; the app narrows by reading
// `qualifiedName`/`packageName`/`targetKey` off it.
export interface InlineTagTarget {
    name?: string;
    qualifiedName?: string;
    packageName?: string;
    packagePath?: string;
    targetKey?: GlobalId;
    externalUrl?: string;
}

export type CommentDisplayPart =
    | { kind: 'text'; text: string }
    | { kind: 'code'; text: string }
    | { kind: 'inline-tag'; tag: `@${string}`; text: string; target?: number | string | InlineTagTarget };

export interface DocCommentBlockTag {
    tag: string;
    text: string;
    name?: string;
    content: CommentDisplayPart[];
}

export interface DocCommentExample {
    caption?: string;
    content: string;
    language?: string;
}

export interface DocComment {
    summary: string;
    summaryParts: CommentDisplayPart[];
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

// A declaration's type, rendered as inline parts (refs resolved). The adapter emits these from AE
// excerpts; the app narrows with `isInlineType` before formatting.
export type DocType = InlineType;

export interface DocTypeParameter {
    id: number;
    name: string;
    constraint?: DocType | null;
    default?: DocType | null;
    comment?: DocComment | null;
    flags: {
        isOptional: boolean;
    };
}

export interface DocSignatureParameter {
    id: number;
    name: string;
    kind: number;
    type?: DocType | null;
    defaultValue?: string;
    comment?: DocComment | null;
    flags: DocFlags;
}

export interface DocSignature {
    id?: number;
    name: string;
    kind: number;
    // `overload-N` (1-based) for multi-signature members, empty otherwise. `anchor` mirrors it
    // (bare, no parent slug); apps/docs composes the full member anchor.
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
    kind: number | null;
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
    kind: number;
    kindLabel: string;
    // Reachable from the package entry point. Forgotten/referenced-only declarations are `false`:
    // they get a page + resolve as link targets but are hidden from the sidebar + search (two-tier).
    isExported: boolean;
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
    // Set on the package root only: symbols re-exported from a workspace dependency, each a
    // cross-package reference to its owner's page.
    reexports?: DocReference[];
}

export interface DocSearchEntry {
    slug: string;
    name: string;
    qualifiedName: string;
    packageName: string;
    packageVersion?: string;
    kind: number;
    summary: string | null;
    aliases?: string[];
    file?: string;
    tokens: string[];
}

export interface DocIndexes {
    byId: Map<number, DocNode>;
    bySlug: Map<string, DocNode>;
    byQName: Map<string, DocNode>;
    byKind: Map<number, DocNode[]>;
    search: DocSearchEntry[];
}

export interface DocPackageModel {
    manifest: DocManifestPackage;
    root: DocNode;
    packageDocumentation: DocComment | null;
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
