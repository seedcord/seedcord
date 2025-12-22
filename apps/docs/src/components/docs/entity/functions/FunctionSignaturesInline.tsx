'use client';

import SignatureSelector from '../signatures/SignatureSelector';
import { useActiveSignatureList } from '../utils/useActiveSignatureList';

import type { ActiveSignatureListProps } from '../utils/useActiveSignatureList';
import type { FunctionSignatureModel } from '@lib/docs/types';
import type { ReactElement } from 'react';

function FunctionSignaturesInline({
    signatures
}: {
    signatures: readonly FunctionSignatureModel[];
}): ReactElement | null {
    const mapped = signatures.map((s) => ({ id: s.id, anchor: (s as unknown as ActiveSignatureListProps).anchor }));
    const [activeSignatureId, setActiveSignatureId] = useActiveSignatureList(mapped as ActiveSignatureListProps[]);
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

export default FunctionSignaturesInline;
