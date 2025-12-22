'use client';

import SeeAlso from '../../ui/SeeAlso';
import CommentExamples from '../comments/CommentExamples';
import CommentParagraphs from '../comments/CommentParagraphs';
import SignaturePanel from '../signatures/SignaturePanel';
import SignatureSelector from '../signatures/SignatureSelector';
import { useActiveSignature } from '../utils/useActiveSignature';

import type { EntityMemberSummary, WithParentDeprecationStatus } from '../types';
import type { ReactElement } from 'react';

export type SignatureSelection = [string, (id: string) => void];

interface MemberCardBodyProps extends WithParentDeprecationStatus {
    member: EntityMemberSummary;
}

function MemberCardBody({ member, parentDeprecationStatus }: MemberCardBodyProps): ReactElement {
    const [activeSignatureId, setActiveSignatureId] = useActiveSignature(member);
    const hasSharedDocumentation = member.sharedDocumentation.length > 0;
    const hasSharedExamples = member.sharedExamples.length > 0;

    return (
        <div className="text-subtle mt-4 min-w-0 space-y-4 text-sm">
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
                <p className="text-subtle flex flex-wrap items-baseline gap-2">
                    <span className="font-semibold text-(--text)">Inherited from:</span>
                    {typeof member.inheritedFrom === 'string' ? (
                        <span>{member.inheritedFrom}</span>
                    ) : member.inheritedFrom.href ? (
                        <a href={member.inheritedFrom.href} className="link underline">
                            {member.inheritedFrom.name}
                        </a>
                    ) : (
                        <span>{member.inheritedFrom.name}</span>
                    )}
                </p>
            ) : null}
            {member.throws?.length ? (
                <div>
                    <p className="text-subtle flex flex-wrap items-baseline gap-2">
                        <span className="font-semibold text-(--text)">Throws:</span>
                    </p>
                    <CommentParagraphs paragraphs={member.throws} />
                </div>
            ) : null}
            <SeeAlso entries={member.seeAlso} />
        </div>
    );
}

export default MemberCardBody;
