import { slugifySegment } from '@seedcord/docs-engine/client';
import { cn, tw } from '@seedcord/ui';

import { DOCS_URL } from '#lib/site';

import type { ReactElement } from 'react';

export const LINK = tw`text-(--link) underline underline-offset-4 transition-opacity duration-150 hover:opacity-80`;

export interface RefProps {
    pkg: string;
    children: string;
}

// the reference site builds a cross-package link the same way, in resolve-helpers.ts
export function Ref({ pkg, children }: RefProps): ReactElement {
    // resolve-helpers.ts splits a qualified name on the same pair
    const slug = children.split(/[.#]/).filter(Boolean).map(slugifySegment).join('/');

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
