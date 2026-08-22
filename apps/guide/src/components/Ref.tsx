import { slugifySegment } from '@seedcord/docs-engine/client';
import { cn, tw } from '@seedcord/ui';

import { DOCS_URL } from '#lib/site';

import type { ReactElement, ReactNode } from 'react';

export const LINK = tw`text-(--link) underline underline-offset-4 transition-opacity duration-150 hover:opacity-80`;

export interface RefProps {
    pkg: string;
    symbol: string;
    children: ReactNode;
}

export function Ref({ pkg, symbol, children }: RefProps): ReactElement {
    // the reference site splits a qualified name on the same pair, in resolve-helpers.ts
    const slug = (symbol.match(/[^.#]+/g) ?? []).map(slugifySegment).join('/');

    return (
        <a
            href={`${DOCS_URL}/packages/${pkg}/latest/${slug}`}
            target="_blank"
            rel="noreferrer noopener"
            className={cn(LINK)}
        >
            {children}
        </a>
    );
}
