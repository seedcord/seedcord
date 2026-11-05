'use client';

import {
    Button,
    GithubIcon,
    HotkeysDialog,
    Icon,
    MobileNavButton,
    Navbar as NavbarShell,
    SearchIconButton,
    SearchTrigger,
    SiteSwitcher,
    GUIDE_URL,
    HOME_URL,
    REPO_URL,
    ThemeToggle,
    cn,
    useSiteHotkeys
} from '@seedcord/ui';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { hasMobileNavPanel } from '#components/layout/sidebar/utils/hasMobileNavPanel.ts';
import { useCommandPaletteOpen } from '#components/providers/CommandPaletteProvider.tsx';
import { SITE_URL } from '#lib/site';
import { log } from '#lib/logger';
import { useUIStore } from '#store/ui';

import type { SiteDestination } from '@seedcord/ui';
import type { ReactElement } from 'react';

const SEARCH_LABEL = 'Search docs';

const DESTINATIONS: readonly SiteDestination[] = [
    { label: 'Home', href: HOME_URL },
    { label: 'Guide', href: GUIDE_URL },
    { label: 'Reference', href: SITE_URL, current: true }
];

export function Navbar(): ReactElement {
    const setMobileNavOpen = useUIStore((state) => state.setMobileNavOpen);
    const isMobileNavOpen = useUIStore((state) => state.isMobileNavOpen);
    const palette = useCommandPaletteOpen();
    const showMobileNavButton = hasMobileNavPanel(usePathname());
    const site = useSiteHotkeys({ searchLabel: SEARCH_LABEL, search: palette, panelOpen: isMobileNavOpen });

    const onSearchClick = (): void => {
        log('Search button clicked');
        palette.setOpen(!palette.open);
    };

    return (
        <>
            <HotkeysDialog {...site.hotkeysDialog} />
            <NavbarShell
                mark={<SiteSwitcher site="docs" destinations={DESTINATIONS} linkAs={Link} {...site.switcher} />}
                center={<SearchTrigger label={SEARCH_LABEL} onOpen={onSearchClick} />}
                actions={
                    <>
                        <SearchIconButton label={SEARCH_LABEL} onOpen={onSearchClick} />
                        {/* the burger panel's footer repeats this link */}
                        <span className={cn(showMobileNavButton ? 'hidden lg:flex' : 'flex', 'items-center gap-2')}>
                            <Button
                                asChild
                                variant="ghost"
                                size="icon"
                                aria-label="Open GitHub repository"
                                className={cn('text-(--text)')}
                            >
                                <Link href={REPO_URL} target="_blank" rel="noreferrer">
                                    <Icon icon={GithubIcon} size={20} />
                                </Link>
                            </Button>
                        </span>
                        {/* moving this into the span above loses it on mobile */}
                        <ThemeToggle />
                        {showMobileNavButton ? (
                            <MobileNavButton
                                open={isMobileNavOpen}
                                onOpen={() => setMobileNavOpen(true)}
                                className={cn('lg:hidden')}
                            />
                        ) : null}
                    </>
                }
            />
        </>
    );
}
