'use client';

import { cn, tw } from '@seedcord/ui';

import { CommentExamples } from '#components/docs/entity/comments/CommentExamples';
import { CommentParagraphs } from '#components/docs/entity/comments/CommentParagraphs';
import { SignaturePanel } from '#components/docs/entity/signatures/SignaturePanel';
import { SignatureSelector } from '#components/docs/entity/signatures/SignatureSelector';
import { useActiveSignature } from '#components/docs/entity/utils/useActiveSignature';
import { SeeAlso } from '#components/docs/SeeAlso';

import type { EntityMemberSummary, WithParentDeprecationStatus } from '#lib/docs/types';
import type { ReactElement } from 'react';

export type SignatureSelection = [string, (id: string) => void];

interface MemberRowBodyProps extends WithParentDeprecationStatus {
    member: EntityMemberSummary;
}

const LABEL_ROW = tw`text-subtle flex flex-wrap items-baseline gap-2`;
const LABEL = tw`font-semibold text-(--text)`;

function InheritedFrom({ from }: { from: NonNullable<EntityMemberSummary['inheritedFrom']> }): ReactElement {
    if (typeof from === 'string') return <span>{from}</span>;
    if (!from.href) return <span>{from.name}</span>;

    return (
        <a
            href={from.href}
            target={from.external ? '_blank' : undefined}
            rel={from.external ? 'noopener noreferrer' : undefined}
            className={cn('link underline', from.external && 'cross-ref')}
        >
            {from.name}
        </a>
    );
}

export function MemberRowBody({ member, parentDeprecationStatus }: MemberRowBodyProps): ReactElement {
    const [activeSignatureId, setActiveSignatureId] = useActiveSignature(member);
    const hasSharedDocumentation = member.sharedDocumentation.length > 0;
    const hasSharedExamples = member.sharedExamples.length > 0;

    return (
        <div className={cn('text-subtle mt-4 min-w-0 space-y-4 text-sm')}>
            <SignatureSelector
                signatures={member.signatures}
                activeSignatureId={activeSignatureId}
                onChange={setActiveSignatureId}
            />
            {hasSharedDocumentation ? <CommentParagraphs paragraphs={member.sharedDocumentation} /> : null}
            {member.signatures.map((signature, index) => (
                <SignaturePanel
                    key={signature.id}
                    signature={signature}
                    isActive={signature.id === activeSignatureId || (!activeSignatureId && index === 0)}
                    parentDeprecationStatus={parentDeprecationStatus ?? member.deprecationStatus}
                />
            ))}
            {hasSharedExamples ? <CommentExamples examples={member.sharedExamples} /> : null}
            {member.inheritedFrom ? (
                <p className={cn(LABEL_ROW)}>
                    <span className={cn(LABEL)}>Inherited from:</span>
                    <InheritedFrom from={member.inheritedFrom} />
                </p>
            ) : null}
            {member.defaultValue?.length ? (
                <p className={cn(LABEL_ROW)}>
                    <span className={cn(LABEL)}>Default:</span>
                    <span dangerouslySetInnerHTML={{ __html: member.defaultValue[0]?.html ?? '' }} />
                </p>
            ) : null}
            {member.throws?.length ? (
                <div>
                    <p className={cn(LABEL_ROW)}>
                        <span className={cn(LABEL)}>Throws:</span>
                    </p>
                    <CommentParagraphs paragraphs={member.throws} isList />
                </div>
            ) : null}
            <SeeAlso entries={member.seeAlso} />
        </div>
    );
}
