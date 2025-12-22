import { Hammer, Sigma, SquareDot, Workflow } from 'lucide-react';

import type { MemberPrefix } from './types';
import type { LucideIcon } from 'lucide-react';

export const MEMBER_HEADER_ICONS: Record<MemberPrefix, LucideIcon> = {
    property: SquareDot,
    method: Workflow,
    constructor: Hammer,
    typeParameter: Sigma
};

export const MEMBER_TITLES: Record<MemberPrefix, string> = {
    property: 'Properties',
    method: 'Methods',
    constructor: 'Constructors',
    typeParameter: 'Type parameters'
};
