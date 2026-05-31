import { cn, CodeBlock } from '@seedcord/ui';

import { CommentExamples } from '../comments/CommentExamples';
import { CommentParagraphs } from '../comments/CommentParagraphs';
import { DeprecatedEntity } from '../DeprecatedEntity';

import type { MemberSignatureDetail, WithParentDeprecationStatus, DeprecationStatus } from '@lib/docs/types';
import type { ReactElement } from 'react';

interface SignaturePanelProps extends WithParentDeprecationStatus {
    signature: MemberSignatureDetail;
    isActive: boolean;
}

export function SignaturePanel({ signature, isActive, parentDeprecationStatus }: SignaturePanelProps): ReactElement {
    const section = (
        <section
            id={signature.anchor || undefined}
            className={cn('space-y-3', isActive ? 'block' : 'hidden')}
            aria-hidden={!isActive}
        >
            <CodeBlock representation={signature.code} copyValue={null} />
            {signature.documentation.length ? <CommentParagraphs paragraphs={signature.documentation} /> : null}
            {signature.examples.length ? <CommentExamples examples={signature.examples} /> : null}
        </section>
    );

    function deprecationMessageKey(ds?: DeprecationStatus): string | null {
        if (!ds?.isDeprecated) return null;
        if (!ds.deprecationMessage) return '__NONE__';
        return ds.deprecationMessage.map((p) => p.plain).join('\n');
    }

    const parentKey = deprecationMessageKey(parentDeprecationStatus);
    const sigKey = deprecationMessageKey(signature.deprecationStatus);

    // When the parent already shows the same deprecation message, the per-signature banner would duplicate it.
    const shouldDecorate =
        isActive &&
        signature.deprecationStatus?.isDeprecated &&
        !parentDeprecationStatus?.isDeprecated &&
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
