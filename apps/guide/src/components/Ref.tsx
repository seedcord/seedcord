import { cn, tw } from '@seedcord/ui';

import type { ReactElement, ReactNode } from 'react';

export const LINK = tw`text-(--link) underline underline-offset-4 transition-opacity duration-150 hover:opacity-80`;

// remarkRefLinks writes the href from a ref: link
export interface RefProps {
    href: string;
    children: ReactNode;
}

export function Ref({ href, children }: RefProps): ReactElement {
    return (
        <a href={href} target="_blank" rel="noreferrer noopener" className={cn(LINK)}>
            {children}
        </a>
    );
}
