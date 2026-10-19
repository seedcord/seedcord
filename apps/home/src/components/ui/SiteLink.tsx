import Link from 'next/link';

import { linkKind } from '#lib/links';

import type { ComponentProps, ReactNode } from 'react';

type SiteLinkProps = Pick<ComponentProps<'a'>, 'className' | 'aria-label' | 'aria-current' | 'children'> & {
    href: string;
};

const NEW_TAB = { target: '_blank', rel: 'noreferrer' } as const;

export function SiteLink({ href, ...rest }: SiteLinkProps): ReactNode {
    const kind = linkKind(href);
    if (kind === 'home-page') return <Link href={href} {...rest} />;

    return <a href={href} {...(kind === 'external' && NEW_TAB)} {...rest} />;
}
