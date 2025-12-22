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
import type { LucideIcon } from 'lucide-react';

export const FOCUS_DELAY_MS = 10;
export const MIN_SEARCH_QUERY_LENGTH = 3;

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
