import type { DocsEngine } from './engine';
import type { MemberAccessLevel } from '@lib/memberAccess';
import type {
    DirectoryEntity,
    DocComment,
    DocNode,
    DocSignatureParameter,
    RenderedSignature
} from '@seedcord/docs-engine';
import type { EntityTone } from '@seedcord/docs-engine/client';
import type { RenameKey } from '@seedcord/types';
import type { CodeRepresentation } from '@seedcord/ui';
import type { Except } from 'type-fest';

export type { CodeRepresentation };

export interface FormatContext {
    engine: DocsEngine;
    manifestPackage: string;
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

export type SeeAlsoEntryWithoutTarget = Except<SeeAlsoEntry, 'target'>;

export type DeprecationStatus =
    | { isDeprecated: false }
    | { isDeprecated: true; deprecationMessage: CommentParagraph[] | undefined };

type WithSourceUrl = Pick<DocNode, 'sourceUrl'>;

type WithCode<Key extends string = 'code'> = Readonly<Record<Key, CodeRepresentation>>;

type WithSummary<Key extends string = 'summary'> = Readonly<Record<Key, readonly CommentParagraph[]>>;

type WithExamples<Key extends string = 'examples'> = Readonly<Record<Key, readonly CommentExample[]>>;

type WithDocs<
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
    extends
        WithCode<'signature'>,
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
    extends WithCode<'signature'>, WithSummary<'summary'>, WithSourceUrl, WithDeprecationStatus {
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
    anchor: string;
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

export interface EntityQueryParams {
    pkg?: string;
    manifestPackage?: string;
    slug?: string;
    symbol?: string;
    qualifiedName?: string;
    kind?: string;
}

type MemberAccessorType = 'getter' | 'setter' | 'accessor';

export interface MemberSignatureDetail
    extends WithCode, WithDocs<'documentation', 'examples'>, WithSourceUrl, WithThrows, WithDeprecationStatus {
    id: string;
    anchor: string;
}

export interface EntityMemberSummary extends WithSourceUrl, WithThrows, WithSeeAlso, WithDeprecationStatus {
    id: string;
    label: string;
    description?: CommentParagraph | null;
    sharedDocumentation: CommentParagraph[];
    sharedExamples: CommentExample[];
    signatures: MemberSignatureDetail[];
    inheritedFrom?: string | { name: string; href?: string };
    tags?: readonly string[];
    access?: MemberAccessLevel;
    accessorType?: MemberAccessorType;
}

export type MemberPrefix = 'property' | 'method' | 'constructor' | 'typeParameter';
export type ClassLikeModel = Extract<EntityModel, { kind: 'class' | 'interface' }>;
export type EnumModel = Extract<EntityModel, { kind: 'enum' }>;
export type TypeModel = Extract<EntityModel, { kind: 'type' }>;
export type FunctionModel = Extract<EntityModel, { kind: 'function' }>;

export type WithParentDeprecationStatus = RenameKey<
    WithDeprecationStatus,
    'deprecationStatus',
    'parentDeprecationStatus'
>;
