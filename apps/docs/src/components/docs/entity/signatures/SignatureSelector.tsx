import { cn } from '@lib/utils';

import type { ReactElement } from 'react';

const OVERLOAD_LABEL_PREFIX = 'Overload';

function SignatureSelector({
    signatures,
    activeSignatureId,
    onChange,
    legend = 'Overloads'
}: {
    signatures: readonly { id: string }[];
    activeSignatureId: string;
    onChange: (id: string) => void;
    legend?: string;
}): ReactElement | null {
    if (signatures.length <= 1) {
        return null;
    }

    return (
        <fieldset className="space-y-2">
            <legend className="text-subtle text-xs font-semibold tracking-widest uppercase">{legend}</legend>
            <div className="flex flex-wrap gap-2">
                {signatures.map((signature, index) => {
                    const checked = signature.id === activeSignatureId;
                    const label = `${OVERLOAD_LABEL_PREFIX} ${index + 1}`;

                    return (
                        <label
                            key={signature.id}
                            className={cn(
                                'cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold transition',
                                checked
                                    ? 'border-(--border-accent-b-moderate) bg-(--surface-accent-b-moderate) text-(--text)'
                                    : 'border-border/70 text-subtle hover:border-(--border-accent-b-subtle)'
                            )}
                        >
                            <input
                                type="radio"
                                name={`signature-selector-${signatures[0]?.id ?? ''}`}
                                value={signature.id}
                                checked={checked}
                                onChange={() => onChange(signature.id)}
                                className="sr-only"
                            />
                            <span>{label}</span>
                        </label>
                    );
                })}
            </div>
        </fieldset>
    );
}

export default SignatureSelector;
