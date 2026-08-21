import { slugifySegment } from '@seedcord/docs-engine/client';
import { cn } from '@seedcord/ui';

import { DOCS_URL } from '#lib/site';

import type { ReactElement } from 'react';

export interface RefProps {
    pkg: string;
    children: string;
}

// the reference site builds a cross-package link the same way, in resolve-helpers.ts
export function Ref({ pkg, children }: RefProps): ReactElement {
    const slug = children.split('.').map(slugifySegment).join('/');

    return (
        <a
            href={`${DOCS_URL}/packages/${pkg}/latest/${slug}`}
            target="_blank"
            rel="noreferrer noopener"
            className={cn(
                'text-(--link) underline underline-offset-4 transition-opacity duration-150 hover:opacity-80'
            )}
        >
            {children}
        </a>
    );
}
