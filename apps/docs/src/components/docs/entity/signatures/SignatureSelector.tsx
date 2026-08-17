import { SegmentedControl, cn, type SegmentedControlOption } from '@seedcord/ui';

import type { ReactElement } from 'react';

const OVERLOAD_LABEL_PREFIX = 'Overload';

export function SignatureSelector({
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

    const options: SegmentedControlOption<string>[] = signatures.map((signature, index) => ({
        value: signature.id,
        label: `${OVERLOAD_LABEL_PREFIX} ${index + 1}`
    }));

    return (
        <div className={cn('flex flex-col items-start')}>
            <SegmentedControl
                options={options}
                value={activeSignatureId}
                onChange={onChange}
                size="sm"
                aria-label={legend}
            />
        </div>
    );
}
