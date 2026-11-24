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

import { DOCS_URL, HOME_URL, REPO_URL, SITE_URL } from '#lib/site';

import { GuideSearch, SEARCH_LABEL } from './GuideSearch';
import { useGuidePageKeys } from './useGuidePageKeys';

import type { PageKeyTargets } from './useGuidePageKeys';
import type { Hotkey, SiteDestination } from '@seedcord/ui';
import type { ReactElement, ReactNode } from 'react';

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

// what a guide page adds to the bar. the 404 renders the bar without one
interface GuidePageBar {
    rows: readonly Hotkey[];
    navOpen: boolean;
    menu: ReactNode;
    tabs: ReactNode;
}

const NO_PAGE: GuidePageBar = { rows: [], navOpen: false, menu: null, tabs: null };

export function GuideBar({ page = NO_PAGE }: { page?: GuidePageBar }): ReactElement {
    const [searchOpen, setSearchOpen] = useState(false);
    const site = useSiteHotkeys({
        searchLabel: SEARCH_LABEL,
        search: { open: searchOpen, setOpen: setSearchOpen },
        panelOpen: page.navOpen,
        pageRows: page.rows
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
                        {page.menu}
                    </>
                }
                tabsClassName={cn('hidden lg:flex')}
                tabs={page.tabs}
            />
        </>
    );
}

export interface GuideNavbarProps {
    targets: PageKeyTargets;
    navOpen: boolean;
    onNavOpen: () => void;
}

export function GuideNavbar({ targets, navOpen, onNavOpen }: GuideNavbarProps): ReactElement {
    // GuideShell renders this navbar inside fumadocs' AnchorProvider
    const rows = useGuidePageKeys(useRouter(), targets, useActiveAnchor());

    return (
        <GuideBar
            page={{
                rows,
                navOpen,
                menu: <MobileNavButton open={navOpen} onOpen={onNavOpen} className={cn('lg:hidden')} />,
                tabs: <NavTabs items={targets.tabs} activeHref={targets.activeHref} linkAs={Link} />
            }}
        />
    );
}
