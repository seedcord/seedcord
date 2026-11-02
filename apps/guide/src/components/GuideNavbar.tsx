'use client';

import {
    Button,
    GithubIcon,
    Icon,
    MobileNavButton,
    Navbar,
    NavTabs,
    SearchIconButton,
    SiteSwitcher,
    ThemeToggle,
    cn
} from '@seedcord/ui';
import Link from 'next/link';
import { useState } from 'react';

import { DOCS_URL, HOME_URL, REPO_URL, SITE_URL } from '#lib/site';

import { GuideSearch, SEARCH_LABEL } from './GuideSearch';
import { useGuideHotkeys } from './useGuideHotkeys';

import type { GuideTab } from '#lib/nav';
import type { SiteDestination } from '@seedcord/ui';
import type { ReactElement } from 'react';

const DESTINATIONS: readonly SiteDestination[] = [
    { label: 'Home', href: HOME_URL },
    { label: 'Guide', href: SITE_URL, current: true },
    { label: 'Reference', href: DOCS_URL }
];

export function GithubLink(): ReactElement {
    return (
        <Button asChild variant="ghost" size="icon" aria-label="Open GitHub repository" className={cn('text-(--text)')}>
            <Link href={REPO_URL} target="_blank" rel="noreferrer">
                <Icon icon={GithubIcon} size={20} />
            </Link>
        </Button>
    );
}

export interface GuideNavbarProps {
    tabs: readonly GuideTab[];
    activeHref: string;
    navOpen: boolean;
    onNavOpen: () => void;
}

export function GuideNavbar({ tabs, activeHref, navOpen, onNavOpen }: GuideNavbarProps): ReactElement {
    const [searchOpen, setSearchOpen] = useState(false);
    const [sitesOpen, setSitesOpen] = useState(false);
    useGuideHotkeys({ toggleSearch: () => setSearchOpen((open) => !open) });

    return (
        <Navbar
            mark={
                <SiteSwitcher
                    site="guide"
                    destinations={DESTINATIONS}
                    open={sitesOpen}
                    onOpenChange={setSitesOpen}
                    linkAs={Link}
                />
            }
            center={<GuideSearch open={searchOpen} onOpenChange={setSearchOpen} />}
            actions={
                <>
                    <SearchIconButton label={SEARCH_LABEL} onOpen={() => setSearchOpen(true)} />
                    <span className={cn('hidden lg:flex')}>
                        <GithubLink />
                    </span>
                    <ThemeToggle />
                    <MobileNavButton open={navOpen} onOpen={onNavOpen} className={cn('lg:hidden')} />
                </>
            }
            tabsClassName={cn('hidden lg:flex')}
            tabs={<NavTabs items={tabs} activeHref={activeHref} linkAs={Link} />}
        />
    );
}
