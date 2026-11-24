import { PRODUCTION_SITES } from '@seedcord/brand';
import { cn, PosterFooter } from '@seedcord/ui';
import { skillUrl } from '@seedcord/ui/skills';
import { SEEDCORD_SKILL } from '@seedcord/ui/skills/seedcord';

import { SiteLink } from '#components/ui/SiteLink';
import { BLOG_PATH } from '#lib/blog/paths';
import { AUTHOR_GITHUB_URL, AUTHOR_URL, DISCORD_URL, GUIDE_URL, NPM_ORG_URL, REPO_URL, ROADMAP_URL } from '#lib/site';

import type { ReactNode } from 'react';

const COLUMNS = [
    {
        title: 'Documentation',
        links: [
            { label: 'API reference', href: PRODUCTION_SITES.docs.url },
            { label: 'Agent skill', href: skillUrl(SEEDCORD_SKILL) },
            { label: 'Guide', href: GUIDE_URL }
        ]
    },
    {
        title: 'Community',
        links: [
            { label: 'npm org', href: NPM_ORG_URL },
            { label: 'Discord', href: DISCORD_URL },
            { label: 'GitHub', href: REPO_URL }
        ]
    },
    {
        title: 'Project',
        links: [
            { label: 'Releases', href: `${REPO_URL}/releases` },
            { label: 'Roadmap', href: ROADMAP_URL },
            { label: 'License', href: `${REPO_URL}/blob/main/LICENSE` },
            { label: 'Issues', href: `${REPO_URL}/issues` },
            { label: 'Blog', href: BLOG_PATH }
        ]
    }
];

export function Footer(): ReactNode {
    return (
        <PosterFooter
            tagline="An end-to-end typed framework for Discord bots."
            columns={COLUMNS}
            linkAs={SiteLink}
            credit={
                <>
                    Built by{' '}
                    <SiteLink
                        href={AUTHOR_URL}
                        className={cn('font-semibold text-(--seed-dark) transition-colors hover:text-(--flesh)')}
                    >
                        materwelonDhruv
                    </SiteLink>
                    {' · '}
                    <SiteLink
                        href={AUTHOR_GITHUB_URL}
                        className={cn('text-(--seed-dark) transition-colors hover:text-(--flesh)')}
                    >
                        GitHub
                    </SiteLink>
                </>
            }
        />
    );
}
