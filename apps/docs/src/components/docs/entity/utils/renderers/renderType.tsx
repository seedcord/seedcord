import MemberDetailGroup from '../../member/MemberDetailGroup';

import type { TypeModel } from '../../types';
import type { ReactElement } from 'react';

export function renderType(model: TypeModel): ReactElement {
    return (
        <div className="space-y-6">
            {model.typeParameters.length ? (
                <MemberDetailGroup items={model.typeParameters} prefix="typeParameter" />
            ) : null}
        </div>
    );
}
