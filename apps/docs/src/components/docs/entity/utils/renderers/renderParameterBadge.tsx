import type { FunctionSignatureModel } from '@lib/docs/types';
import type { ReactElement } from 'react';

export function renderParameterBadge(parameter: FunctionSignatureModel['parameters'][number]): ReactElement {
    return (
        <span className="bg-surface-94 text-subtle inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs">
            <span className="font-semibold text-[color-mix(in_oklab,var(--entity-function-color)_72%,var(--text))]">
                {parameter.name}
            </span>
            {parameter.optional ? <span className="uppercase">optional</span> : null}
        </span>
    );
}
