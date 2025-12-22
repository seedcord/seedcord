import type { EntityTone } from '../entityMetadata';
import type { DocsEngine } from './engine';
import type { EntityMemberSummary } from '@components/docs/entity/types';
import type {
    DirectoryEntity,
    DocComment,
    DocNode,
    DocSignatureParameter,
    RenderedSignature
} from '@seedcord/docs-engine';
import type { ReadonlyRecord, TypedOmit } from '@seedcord/types';

export interface FormatContext {
    engine: DocsEngine;
    manifestPackage: string;
}

export interface CodeRepresentation {
    text: string;
    html: string | null;
}

export type CommentDisplayPart = NonNullable<DocComment['summaryParts']>[number];

export type InlineTagPart = CommentDisplayPart & {
    kind: 'inline-tag';
    tag?: string;
    text?: string;
    target?: unknown;
    url?: string;
};

export interface CommentParagraph {
    plain: string;
    html: string;
}

export interface CommentExample {
    caption?: string;
    code: CodeRepresentation;
}

export interface SeeAlsoEntry {
    name: string;
    href?: string;
    target?: unknown;
}

export type SeeAlsoEntryWithoutTarget = TypedOmit<SeeAlsoEntry, 'target'>;

export type DeprecationStatus =
    | { isDeprecated: false }
    | { isDeprecated: true; deprecationMessage: CommentParagraph[] | undefined };

export type WithSourceUrl = Pick<DocNode, 'sourceUrl'>;

export type WithCode<Key extends string = 'code'> = ReadonlyRecord<Key, CodeRepresentation>;

export type WithSummary<Key extends string = 'summary'> = ReadonlyRecord<Key, readonly CommentParagraph[]>;

export type WithExamples<Key extends string = 'examples'> = ReadonlyRecord<Key, readonly CommentExample[]>;

export type WithDocs<
    SummaryKey extends string = 'summary',
    ExamplesKey extends string = 'examples'
> = WithSummary<SummaryKey> & WithExamples<ExamplesKey>;

export type WithDeprecationStatus<IsRequired = false> = IsRequired extends true
    ? Record<'deprecationStatus', DeprecationStatus>
    : Partial<Record<'deprecationStatus', DeprecationStatus | undefined>>;

export type WithThrows<IsRequired = false> = IsRequired extends true
    ? Record<'throws', readonly CommentParagraph[]>
    : Partial<Record<'throws', readonly CommentParagraph[] | undefined>>;

export type WithSeeAlso<IsRequired = false, HasTarget = false> = IsRequired extends true
    ? Record<'seeAlso', HasTarget extends true ? readonly SeeAlsoEntry[] : readonly SeeAlsoEntryWithoutTarget[]>
    : Partial<
          Record<
              'seeAlso',
              HasTarget extends true ? readonly SeeAlsoEntry[] : readonly SeeAlsoEntryWithoutTarget[] | undefined
          >
      >;

export interface FormattedComment extends WithThrows, WithSeeAlso {
    paragraphs: readonly CommentParagraph[];
    examples: readonly CommentExample[];
}

export interface NavigationEntityItem {
    id: string;
    label: string;
    href: string;
}

export interface NavigationCategory {
    id: DirectoryEntity;
    title: string;
    tone: EntityTone;
    items: readonly NavigationEntityItem[];
}

export interface PackageVersionCatalog {
    id: string;
    label: string;
    summary: string;
    manifestVersion: string;
    basePath: string;
    categories: readonly NavigationCategory[];
}

export interface PackageCatalogEntry {
    id: string;
    manifestName: string;
    label: string;
    description: string;
    versions: readonly PackageVersionCatalog[];
}

export type DocsCatalog = readonly PackageCatalogEntry[];

export interface CategoryConfig {
    readonly entity: DirectoryEntity;
    readonly title: string;
    readonly tone: EntityTone;
}

export type EntityKind = EntityTone;

export interface BaseEntityModel
    extends WithCode<'signature'>,
        WithDocs<'summary', 'summaryExamples'>,
        WithSourceUrl,
        WithDeprecationStatus,
        WithThrows,
        WithSeeAlso {
    kind: EntityKind;
    name: string;
    slug: string;
    qualifiedName: string;
    manifestPackage: string;
    displayPackage: string;
    tags?: readonly string[];
    version?: string;
}

export interface ClassLikeEntityModel extends BaseEntityModel {
    typeParameters: EntityMemberSummary[];
    properties: EntityMemberSummary[];
    methods: EntityMemberSummary[];
    constructors: EntityMemberSummary[];
}

export interface EnumMemberModel
    extends WithCode<'signature'>,
        WithSummary<'summary'>,
        WithSourceUrl,
        WithDeprecationStatus {
    id: string;
    label: string;
    value?: DocNode['defaultValue'];
    tags?: readonly string[];
}

export interface EnumEntityModel extends BaseEntityModel {
    kind: 'enum';
    members: EnumMemberModel[];
}

export interface TypeEntityModel extends BaseEntityModel {
    kind: 'type';
    declaration: CodeRepresentation;
    typeParameters: EntityMemberSummary[];
}

export interface FunctionSignatureParameterModel {
    name: DocSignatureParameter['name'];
    optional: boolean;
    type?: string;
    defaultValue?: DocSignatureParameter['defaultValue'];
    documentation: readonly CommentParagraph[];
    display?: CodeRepresentation;
}

type RenderedTypeParameter = NonNullable<RenderedSignature['typeParams']>[number];

export interface FunctionTypeParameterModel {
    name: RenderedTypeParameter['name'];
    constraint?: string | undefined;
    default?: string | undefined;
    description?: string | undefined;
    code?: CodeRepresentation | undefined;
}

export interface FunctionSignatureModel extends WithCode, WithDocs, WithSourceUrl, WithDeprecationStatus, WithThrows {
    id: string;
    overloadIndex: number;
    parameters: FunctionSignatureParameterModel[];
    typeParameters?: FunctionTypeParameterModel[];
    returnType?: string;
}

export interface FunctionEntityModel extends BaseEntityModel {
    kind: 'function';
    signatures: FunctionSignatureModel[];
}

export interface VariableEntityModel extends BaseEntityModel {
    kind: 'variable';
    declaration: CodeRepresentation;
}

export type EntityModel =
    | (ClassLikeEntityModel & { kind: 'class' })
    | (ClassLikeEntityModel & { kind: 'interface' })
    | EnumEntityModel
    | TypeEntityModel
    | FunctionEntityModel
    | VariableEntityModel;

export type ExternalDocumentationMap = ReadonlyMap<string, string>;
export interface EntityQueryParams {
    pkg?: string;
    manifestPackage?: string;
    slug?: string;
    symbol?: string;
    qualifiedName?: string;
    kind?: string;
}
export interface InternalEntityLookupParams {
    manifestPackage: string;
    slug?: string;
    symbol?: string;
    qualifiedName?: string;
    kind: EntityKind | null;
}
export interface BuildEntityHrefOptions {
    name: string;
    slug: string;
    version?: string | null;
    tone?: string | null;
}

export interface ParagraphAccumulator {
    append(plain: string, html: string): void;
    breakParagraph(): void;
    toParagraphs(): CommentParagraph[];
}
