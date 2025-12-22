import CodePanel from '@ui/CodePanel';

import type { VariableModel } from '../../types';
import type { ReactElement } from 'react';

export function renderVariable(model: VariableModel): ReactElement {
    return (
        <CodePanel
            representation={model.declaration}
            title="Variable declaration"
            description="Sourced directly from the debugging manifest so you can inspect runtime defaults without leaving the docs."
        />
    );
}
