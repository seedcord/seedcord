import SignatureCard from '../signatures/SignatureCard';
import SignatureSelector from '../signatures/SignatureSelector';
import { useActiveSignatureList } from '../utils/useActiveSignatureList';

import type { ActiveSignatureListProps } from '../utils/useActiveSignatureList';
import type { FunctionSignatureModel } from '@lib/docs/types';
import type { ReactElement } from 'react';

interface FunctionSignaturesSectionProps {
    signatures: readonly FunctionSignatureModel[];
}

function FunctionSignaturesSection({ signatures }: FunctionSignaturesSectionProps): ReactElement | null {
    const mapped = signatures.map((s) => ({ id: s.id, anchor: (s as unknown as ActiveSignatureListProps).anchor }));
    const [activeSignatureId, setActiveSignatureId] = useActiveSignatureList(mapped as ActiveSignatureListProps[]);

    if (!signatures.length) return null;

    const activeSignature = (signatures.find((s) => s.id === activeSignatureId) ??
        signatures[0]) as FunctionSignatureModel;

    return (
        <section className="space-y-4">
            <header className="space-y-1">
                <h2 className="text-xl font-semibold text-[color-mix(in_oklab,var(--entity-function-color)_72%,var(--text))]">
                    {signatures.length === 1 ? 'Function Signature' : 'Function Signatures'}
                </h2>
            </header>

            <SignatureSelector
                signatures={signatures}
                activeSignatureId={activeSignatureId}
                onChange={setActiveSignatureId}
                legend={signatures.length === 1 ? 'Signature' : 'Overloads'}
            />

            <div>
                <SignatureCard key={activeSignature.id} signature={activeSignature} />
            </div>
        </section>
    );
}

export default FunctionSignaturesSection;
