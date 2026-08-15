'use client';

import { paramFragment, typeParamFragment, withOverload } from '@seedcord/docs-engine/client';
import { cn } from '@seedcord/ui';
import { useMemo } from 'react';

import { MemberDetailGroup } from '#components/docs/entity/member/MemberDetailGroup';
import { useActiveSignatureList } from '#components/docs/entity/utils/useActiveSignatureList';

import type {
    EntityMemberSummary,
    FunctionEntityModel,
    FunctionTypeParameterModel,
    FunctionSignatureParameterModel,
    CodeRepresentation
} from '#lib/docs/types';
import type { ReactElement } from 'react';

function buildTypeParamMember(tp: FunctionTypeParameterModel): EntityMemberSummary {
    const id = typeParamFragment(tp.name);
    const codeText = [
        tp.name,
        tp.constraint ? `extends ${tp.constraint}` : undefined,
        tp.default ? `= ${tp.default}` : undefined
    ]
        .filter(Boolean)
        .join(' ');
    const codeRepresentation: CodeRepresentation = tp.code ?? { text: codeText, html: null };

    return {
        id,
        label: tp.name,
        description: tp.description ? { plain: tp.description, html: tp.description } : { plain: '', html: '' },
        sharedDocumentation: [],
        sharedExamples: [],
        signatures: [
            {
                id,
                anchor: '',
                code: { text: codeRepresentation.text, html: codeRepresentation.html ?? null },
                documentation: tp.description ? [{ plain: tp.description, html: tp.description }] : [],
                examples: []
            }
        ]
    };
}

// this reuses EntityMemberSummary. a dedicated FunctionParamMember type would cascade into MemberRow's prop signature
function buildParamMember(
    p: FunctionSignatureParameterModel,
    overloadIndex: number,
    totalSignatures: number
): EntityMemberSummary {
    const id = withOverload(paramFragment(p.name), overloadIndex, totalSignatures);
    const label = p.name + (p.optional ? '?' : '');

    const codeText = p.type ? `${label}: ${p.type}` : label;
    const codeRep: CodeRepresentation = p.display ?? { text: codeText, html: null };

    const member: EntityMemberSummary = {
        id,
        label,
        description: { plain: '', html: '' },
        sharedDocumentation: [],
        sharedExamples: [],
        signatures: [
            {
                id,
                anchor: '',
                code: codeRep,
                documentation: p.documentation,
                examples: []
            }
        ]
    };
    if (p.defaultValue?.length) member.defaultValue = p.defaultValue;
    return member;
}

export function FunctionBody({ model }: { model: FunctionEntityModel }): ReactElement | null {
    const signatures = model.signatures;
    const [activeSignatureId] = useActiveSignatureList(signatures);

    const activeSignature = useMemo(
        () => signatures.find((s) => s.id === activeSignatureId) ?? signatures[0],
        [signatures, activeSignatureId]
    );

    if (!signatures.length || !activeSignature) return null;

    const rawTypeParams = activeSignature.typeParameters ?? [];
    const typeParameterItems: EntityMemberSummary[] = rawTypeParams.map((tp) => buildTypeParamMember(tp));

    const parameterItems: EntityMemberSummary[] = activeSignature.parameters.map((p) =>
        buildParamMember(p, activeSignature.overloadIndex, signatures.length)
    );

    return (
        <section className={cn('space-y-6')}>
            <div>
                <MemberDetailGroup items={typeParameterItems} prefix="typeParameter" />
            </div>
            <div>
                <MemberDetailGroup items={parameterItems} prefix="property" title="Params" />
            </div>
        </section>
    );
}
