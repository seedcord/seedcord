'use client';

import { useMemo } from 'react';

import MemberDetailGroup from '../member/MemberDetailGroup';
import { useActiveSignatureList } from '../utils/useActiveSignatureList';

import type { EntityMemberSummary } from '../types';
import type { ActiveSignatureListProps } from '../utils/useActiveSignatureList';
import type {
    FunctionEntityModel,
    FunctionSignatureModel,
    FunctionTypeParameterModel,
    FunctionSignatureParameterModel,
    CodeRepresentation
} from '@lib/docs/types';
import type { ReactElement } from 'react';

function buildTypeParamMember(tp: FunctionTypeParameterModel, index: number): EntityMemberSummary {
    const id = `typeparam-${tp.name}-${index}`;
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
                id: `${id}-sig`,
                anchor: `${id}-sig`,
                code: { text: codeRepresentation.text, html: codeRepresentation.html ?? null },
                documentation: tp.description ? [{ plain: tp.description, html: tp.description }] : [],
                examples: []
            }
        ]
    } as unknown as EntityMemberSummary;
}

function buildParamMember(p: FunctionSignatureParameterModel, index: number): EntityMemberSummary {
    const id = `param-${p.name}-${index}`;
    const label = p.name + (p.optional ? '?' : '');

    const defaultTextParts: string[] = [];
    if (p.type) defaultTextParts.push(`${label}: ${p.type}`);
    else defaultTextParts.push(label);
    if (p.defaultValue !== undefined) defaultTextParts.push(`= ${p.defaultValue}`);

    const codeRep: CodeRepresentation = p.display ?? { text: defaultTextParts.join(' '), html: null };

    return {
        id,
        label,
        description: { plain: '', html: '' },
        sharedDocumentation: [],
        sharedExamples: [],
        signatures: [
            {
                id: `${id}-sig`,
                anchor: `${id}-sig`,
                code: codeRep,
                documentation: p.documentation,
                examples: []
            }
        ],
        sourceUrl: undefined
    } as unknown as EntityMemberSummary;
}

function FunctionBody({ model }: { model: FunctionEntityModel }): ReactElement | null {
    const signatures = model.signatures;
    const mapped = signatures.map((s) => ({ id: s.id, anchor: (s as unknown as ActiveSignatureListProps).anchor }));
    const [activeSignatureId] = useActiveSignatureList(mapped as ActiveSignatureListProps[]);

    const activeSignature = useMemo(
        () => signatures.find((s) => s.id === activeSignatureId) ?? signatures[0],
        [signatures, activeSignatureId]
    ) as FunctionSignatureModel;

    if (!signatures.length) return null;

    const rawTypeParams = activeSignature.typeParameters ?? [];
    const typeParameterItems: EntityMemberSummary[] = rawTypeParams.map((tp, idx) => buildTypeParamMember(tp, idx));

    const parameterItems: EntityMemberSummary[] = activeSignature.parameters.map((p, idx) => buildParamMember(p, idx));

    return (
        <section className="space-y-6">
            <div>
                <MemberDetailGroup items={typeParameterItems} prefix="typeParameter" />
            </div>
            <div>
                <MemberDetailGroup items={parameterItems} prefix="property" title="Params" />
            </div>
        </section>
    );
}

export default FunctionBody;
