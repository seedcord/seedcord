import { FunctionBody } from '@components/docs/entity/functions/FunctionBody';

import type { FunctionModel } from '@lib/docs/types';
import type { ReactElement } from 'react';

export function renderFunction(model: FunctionModel): ReactElement | null {
    return <FunctionBody model={model} />;
}
