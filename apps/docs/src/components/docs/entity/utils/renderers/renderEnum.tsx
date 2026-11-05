import { EnumMembersSection } from '#components/docs/entity/enums/EnumMembersSection.tsx';

import type { EnumModel } from '#lib/docs/types';
import type { ReactElement } from 'react';

export function renderEnum(model: EnumModel): ReactElement {
    return <EnumMembersSection members={model.members} />;
}
