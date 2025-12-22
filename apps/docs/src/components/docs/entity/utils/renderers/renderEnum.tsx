import EnumMembersSection from '../../enums/EnumMembersSection';

import type { EnumModel } from '../../types';
import type { ReactElement } from 'react';

export function renderEnum(model: EnumModel): ReactElement {
    return <EnumMembersSection members={model.members} />;
}
