'use client';

import { SignatureSelector } from '../signatures/SignatureSelector';
import { useActiveSignatureList } from '../utils/useActiveSignatureList';

import type { FunctionSignatureModel } from '@lib/docs/types';
import type { ReactElement } from 'react';

export function FunctionSignaturesInline({
    signatures
}: {
    signatures: readonly FunctionSignatureModel[];
}): ReactElement | null {
    const [activeSignatureId, setActiveSignatureId] = useActiveSignatureList(signatures);
    if (!signatures.length) return null;
    return (
        <div>
            <SignatureSelector
                signatures={signatures}
                activeSignatureId={activeSignatureId}
                onChange={setActiveSignatureId}
                legend={signatures.length === 1 ? 'Signature' : 'Overloads'}
            />
        </div>
    );
}
