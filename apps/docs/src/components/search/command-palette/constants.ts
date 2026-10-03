import {
    Braces,
    ExternalLink,
    FileText,
    FunctionSquare,
    Workflow,
    Hammer,
    ListTree,
    PackageSearch,
    Puzzle,
    Sigma,
    SquareDot,
    SquareStack,
    Variable
} from 'lucide-react';

import type { SearchResultKind } from './types';
import type { DropdownOption } from '@seedcord/ui';
import type { LucideIcon } from 'lucide-react';

export const KIND_FILTERS = [
    { value: 'all', label: 'All kinds' },
    { value: 'class', label: 'Classes' },
    { value: 'interface', label: 'Interfaces' },
    { value: 'type', label: 'Types' },
    { value: 'enum', label: 'Enums' },
    { value: 'function', label: 'Functions' },
    { value: 'variable', label: 'Variables' },
    { value: 'member', label: 'Members' }
] as const satisfies readonly DropdownOption[];

export type KindFilter = (typeof KIND_FILTERS)[number]['value'];

export const ALL_PACKAGES = 'all';

export function isKindFilter(value: string): value is KindFilter {
    return KIND_FILTERS.some((option) => option.value === value);
}

export const FOCUS_DELAY_MS = 10;
export const MIN_SEARCH_QUERY_LENGTH = 2;
export const COMMAND_LISTBOX_ID = 'command-listbox';

export const SEARCH_KIND_ICONS: Record<SearchResultKind, LucideIcon> = {
    package: PackageSearch,
    page: FileText,
    resource: ExternalLink,
    class: SquareStack,
    interface: Puzzle,
    type: Braces,
    enum: ListTree,
    function: FunctionSquare,
    constructor: Hammer,
    method: Workflow,
    property: SquareDot,
    variable: Variable,
    parameter: SquareDot,
    typeParameter: Sigma,
    enumMember: ListTree
};
