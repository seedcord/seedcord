'use client';

import {
    Button,
    GithubIcon,
    Icon,
    MobileNavButton,
    Navbar as NavbarShell,
    SearchIconButton,
    SearchTrigger,
    SiteSwitcher,
    ThemeToggle,
    cn
} from '@seedcord/ui';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { hasMobileNavPanel } from '#components/layout/sidebar/utils/hasMobileNavPanel';
import { GUIDE_URL, HOME_URL, REPO_URL, SITE_URL } from '#lib/site';
import { log } from '#lib/logger';
import { useUIStore } from '#store/ui';

import { HeaderSettingsPopover } from './HeaderSettingsPopover';

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
    const isCommandPaletteOpen = useUIStore((state) => state.isCommandPaletteOpen);
    const setCommandPaletteOpen = useUIStore((state) => state.setCommandPaletteOpen);
    const showMobileNavButton = hasMobileNavPanel(usePathname());

    const openSearch = (): void => {
        log('Search button clicked');
        setCommandPaletteOpen(!isCommandPaletteOpen);
    };

    return (
        <NavbarShell
            mark={<SiteSwitcher site="docs" destinations={DESTINATIONS} linkAs={Link} />}
            center={<SearchTrigger label={SEARCH_LABEL} onOpen={openSearch} />}
            actions={
                <>
                    <SearchIconButton label={SEARCH_LABEL} onOpen={openSearch} />
                    <ThemeToggle />
                    {/* the burger panel's footer holds these two */}
                    <span className={cn(showMobileNavButton ? 'hidden lg:flex' : 'flex', 'items-center gap-2')}>
                        <HeaderSettingsPopover />
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
    );
}
