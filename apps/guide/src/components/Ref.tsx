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
    // the reference site anchors a member on its owner's page, in AnchorStrategy.buildMemberHref
    const [owner, ...members] = (symbol.match(/[^.#]+/g) ?? []).map(slugifySegment);
    const anchor = members.at(-1);
    const page = `${DOCS_URL}/packages/${pkg}/latest`;

    return (
        <a
            href={owner === undefined ? page : `${page}/${owner}${anchor ? `#${anchor}` : ''}`}
            target="_blank"
            rel="noreferrer noopener"
            className={cn(LINK)}
        >
            {children}
        </a>
    );
}
