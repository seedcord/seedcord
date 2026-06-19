'use client';

import { cn } from '@seedcord/ui';

import { CommentExamples } from '@components/docs/entity/comments/CommentExamples';
import { CommentParagraphs } from '@components/docs/entity/comments/CommentParagraphs';
import { SignaturePanel } from '@components/docs/entity/signatures/SignaturePanel';
import { SignatureSelector } from '@components/docs/entity/signatures/SignatureSelector';
import { useActiveSignature } from '@components/docs/entity/utils/useActiveSignature';
import { SeeAlso } from '@components/docs/SeeAlso';

import type { EntityMemberSummary, WithParentDeprecationStatus } from '@lib/docs/types';
import type { ReactElement } from 'react';

export type SignatureSelection = [string, (id: string) => void];

interface MemberRowBodyProps extends WithParentDeprecationStatus {
    member: EntityMemberSummary;
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
                <p className={cn('text-subtle flex flex-wrap items-baseline gap-2')}>
                    <span className={cn('font-semibold text-(--text)')}>Inherited from:</span>
                    {typeof member.inheritedFrom === 'string' ? (
                        <span>{member.inheritedFrom}</span>
                    ) : member.inheritedFrom.href ? (
                        <a
                            href={member.inheritedFrom.href}
                            target={member.inheritedFrom.external ? '_blank' : undefined}
                            rel={member.inheritedFrom.external ? 'noopener noreferrer' : undefined}
                            className={cn('link underline', member.inheritedFrom.external && 'cross-ref')}
                        >
                            {member.inheritedFrom.name}
                        </a>
                    ) : (
                        <span>{member.inheritedFrom.name}</span>
                    )}
                </p>
            ) : null}
            {member.defaultValue?.length ? (
                <p className={cn('text-subtle flex flex-wrap items-baseline gap-2')}>
                    <span className={cn('font-semibold text-(--text)')}>Default:</span>
                    <span dangerouslySetInnerHTML={{ __html: member.defaultValue[0]?.html ?? '' }} />
                </p>
            ) : null}
            {member.throws?.length ? (
                <div>
                    <p className={cn('text-subtle flex flex-wrap items-baseline gap-2')}>
                        <span className={cn('font-semibold text-(--text)')}>Throws:</span>
                    </p>
                    <CommentParagraphs paragraphs={member.throws} isList />
                </div>
            ) : null}
            <SeeAlso entries={member.seeAlso} />
        </div>
    );
}
