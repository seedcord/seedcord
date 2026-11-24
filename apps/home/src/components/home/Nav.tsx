import { PRODUCTION_SITES, STAGE } from '@seedcord/brand';
import { cn, GithubIcon, PosterButton, PosterNav } from '@seedcord/ui';

import { GithubStars } from '#components/GithubStars';
import { NpmVersion } from '#components/NpmVersion';
import { SiteLink } from '#components/ui/SiteLink';
import { BLOG_PATH } from '#lib/blog/paths';
import { GUIDE_URL, REPO_URL } from '#lib/site';

import type { ReactNode } from 'react';

const SITES = [
    { label: 'Guide', href: GUIDE_URL },
    { label: 'Docs', href: PRODUCTION_SITES.docs.url }
];

interface NavProps {
    onBlogIndex?: boolean;
}

export function Nav({ onBlogIndex = false }: NavProps): ReactNode {
    return (
        <PosterNav
            tag={STAGE}
            primary={{ label: 'Blog', href: BLOG_PATH, current: onBlogIndex }}
            links={SITES}
            linkAs={SiteLink}
            actions={
                <>
                    <span className={cn('contents max-[359px]:hidden')}>
                        <NpmVersion />
                    </span>
                    <PosterButton variant="ink">
                        <SiteLink href={REPO_URL}>
                            <GithubIcon variant="mark" size={20} aria-hidden className={cn('shrink-0 md:hidden')} />
                            <span className={cn('sr-only md:not-sr-only')}>GitHub</span>
                            <GithubStars />
                        </SiteLink>
                    </PosterButton>
                </>
            }
        />
    );
}
