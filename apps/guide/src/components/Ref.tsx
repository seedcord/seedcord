import { cn, tw } from '@seedcord/ui';

import { refHref } from '#lib/refHref';

import type { ReactElement, ReactNode } from 'react';

export const LINK = tw`text-(--link) underline underline-offset-4 transition-opacity duration-150 hover:opacity-80`;

export interface RefProps {
    pkg: string;
    symbol: string;
    children: ReactNode;
}

export function Ref({ pkg, symbol, children }: RefProps): ReactElement {
    return (
        <a href={refHref(pkg, symbol)} target="_blank" rel="noreferrer noopener" className={cn(LINK)}>
            {children}
        </a>
    );
}
