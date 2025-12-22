import type {
    CommentExample,
    CommentParagraph,
    EntityModel,
    WithCode,
    WithDeprecationStatus,
    WithDocs,
    WithSeeAlso,
    WithSourceUrl,
    WithThrows
} from '@lib/docs/types';
import type { MemberAccessLevel } from '@lib/memberAccess';
import type { RenameKey } from '@seedcord/types';

export type MemberAccessorType = 'getter' | 'setter' | 'accessor';

export interface MemberSignatureDetail
    extends WithCode,
        WithDocs<'documentation', 'examples'>,
        WithSourceUrl,
        WithThrows,
        WithDeprecationStatus {
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

export interface EntityMembersByKind {
    properties: readonly EntityMemberSummary[];
    methods: readonly EntityMemberSummary[];
    constructors: readonly EntityMemberSummary[];
    typeParameters?: readonly EntityMemberSummary[];
}
export type MemberPrefix = 'property' | 'method' | 'constructor' | 'typeParameter';
export type ClassLikeModel = Extract<EntityModel, { kind: 'class' | 'interface' }>;
export type EnumModel = Extract<EntityModel, { kind: 'enum' }>;
export type TypeModel = Extract<EntityModel, { kind: 'type' }>;
export type FunctionModel = Extract<EntityModel, { kind: 'function' }>;
export type VariableModel = Extract<EntityModel, { kind: 'variable' }>;

export type WithParentDeprecationStatus = RenameKey<
    WithDeprecationStatus,
    'deprecationStatus',
    'parentDeprecationStatus'
>;
