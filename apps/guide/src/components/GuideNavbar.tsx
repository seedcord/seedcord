'use client';

import {
    Button,
    GithubIcon,
    HotkeysDialog,
    Icon,
    MobileNavButton,
    Navbar,
    NavTabs,
    SearchIconButton,
    SiteSwitcher,
    ThemeToggle,
    cn,
    useSiteHotkeys
} from '@seedcord/ui';
import { useActiveAnchor } from 'fumadocs-core/toc';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { DOCS_URL, HOME_URL, REPO_URL, SITE_URL } from '#lib/site.ts';

import { GuideSearch, SEARCH_LABEL } from './GuideSearch';
import { useGuidePageKeys } from './useGuidePageKeys';

import type { PageKeyTargets } from './useGuidePageKeys';
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
    targets: PageKeyTargets;
    navOpen: boolean;
    onNavOpen: () => void;
}

export function GuideNavbar({ targets, navOpen, onNavOpen }: GuideNavbarProps): ReactElement {
    const [searchOpen, setSearchOpen] = useState(false);
    // GuideShell renders this navbar inside fumadocs' AnchorProvider
    const pageRows = useGuidePageKeys(useRouter(), targets, useActiveAnchor());
    const site = useSiteHotkeys({
        searchLabel: SEARCH_LABEL,
        search: { open: searchOpen, setOpen: setSearchOpen },
        panelOpen: navOpen,
        pageRows
    });

    return (
        <>
            <HotkeysDialog {...site.hotkeysDialog} />
            <Navbar
                mark={<SiteSwitcher site="guide" destinations={DESTINATIONS} linkAs={Link} {...site.switcher} />}
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
                tabs={<NavTabs items={targets.tabs} activeHref={targets.activeHref} linkAs={Link} />}
            />
        </>
    );
}
