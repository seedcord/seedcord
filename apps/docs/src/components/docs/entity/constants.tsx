import { cn, tw } from '@seedcord/ui';
import { Hammer, Sigma, SquareDot, Workflow } from 'lucide-react';

import { PROSE_CODE_BLOCK } from '#components/docs/proseCodeBlock';

import type { MemberPrefix } from '#lib/docs/types';
import type { LucideIcon } from 'lucide-react';

// tailwind preflight strips the markers and the indent off a <ul>
export const COMMENT_PROSE = cn(
    tw`[&_p+p]:mt-2`,
    tw`[&_ul]:my-2 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5`,
    tw`[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5`,
    // a loose list wraps each item in a <p>. its margin would drop the text below the bullet
    tw`[&_li>p]:m-0`,
    PROSE_CODE_BLOCK,
    tw`[&_pre]:my-2 [&_pre]:px-3 [&_pre]:py-2`,
    // a link around a shiki chip reads as plain inline code until the underline goes on
    tw`[&_a]:text-(--link) [&_a]:underline [&_a]:underline-offset-4 [&_a]:transition-opacity [&_a]:duration-150 [&_a:hover]:opacity-80`
);

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
