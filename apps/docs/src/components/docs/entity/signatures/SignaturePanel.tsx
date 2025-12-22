import { cn } from '../../../../lib/utils';
import CommentExamples from '../comments/CommentExamples';
import CommentParagraphs from '../comments/CommentParagraphs';
import DeprecatedEntity from '../DeprecatedEntity';

import type { MemberSignatureDetail, WithParentDeprecationStatus } from '../types';
import type { DeprecationStatus } from '@lib/docs/types';
import type { ReactElement } from 'react';

export const SIGNATURE_CONTAINER_CLASS = 'code-scroll-area panel px-2.5 py-2 text-(--text) md:px-3 md:py-2.5';

interface SignaturePanelProps extends WithParentDeprecationStatus {
    signature: MemberSignatureDetail;
    isActive: boolean;
}

function SignaturePanel({ signature, isActive, parentDeprecationStatus }: SignaturePanelProps): ReactElement {
    const section = (
        <section
            id={signature.anchor}
            className={cn('space-y-3', isActive ? 'block' : 'hidden')}
            aria-hidden={!isActive}
        >
            <div className={SIGNATURE_CONTAINER_CLASS}>
                {signature.code.html ? (
                    <div className="code-scroll-content" dangerouslySetInnerHTML={{ __html: signature.code.html }} />
                ) : (
                    <pre className="code-scroll-content text-sm whitespace-pre text-(--text)">
                        <code>{signature.code.text}</code>
                    </pre>
                )}
            </div>
            {signature.documentation.length ? <CommentParagraphs paragraphs={signature.documentation} /> : null}
            {signature.examples.length ? <CommentExamples examples={signature.examples} /> : null}
            {signature.throws?.length ? (
                <div>
                    <p className="text-subtle flex flex-wrap items-baseline gap-2">
                        <span className="font-semibold text-(--text)">Throws:</span>
                    </p>
                    <CommentParagraphs paragraphs={signature.throws} />
                </div>
            ) : null}
        </section>
    );

    function deprecationMessageKey(ds?: DeprecationStatus): string | null {
        if (!ds?.isDeprecated) return null;
        if (!ds.deprecationMessage) return '__NONE__';
        return ds.deprecationMessage.map((p) => p.plain).join('\n');
    }

    const parentKey = deprecationMessageKey(parentDeprecationStatus);
    const sigKey = deprecationMessageKey(signature.deprecationStatus);

    // Only decorate when:
    // - the signature is active (visible),
    // - the signature is deprecated,
    // - the parent is NOT deprecated,
    // - and the parent's deprecation message is not equal to the signature's.
    const shouldDecorate =
        Boolean(isActive) &&
        Boolean(signature.deprecationStatus?.isDeprecated) &&
        !Boolean(parentDeprecationStatus?.isDeprecated) &&
        parentKey !== sigKey;

    if (shouldDecorate) {
        return (
            <DeprecatedEntity
                deprecationStatus={signature.deprecationStatus ?? { isDeprecated: true, deprecationMessage: undefined }}
            >
                {section}
            </DeprecatedEntity>
        );
    }

    return section;
}

export default SignaturePanel;
