'use client';

import { Button, GithubIcon, Icon, cn } from '@seedcord/ui';
import { Menu } from 'lucide-react';
import Link from 'next/link';

import { useUIStore } from '@store/ui';

import { HeaderSettingsPopover } from './HeaderSettingsPopover';
import { HeaderSearchControls } from './search-controls/HeaderSearchControls';
import { SeedcordMark } from './SeedcordMark';

import type { ReactElement } from 'react';

export function Navbar(): ReactElement {
    const setMobileNavOpen = useUIStore((state) => state.setMobileNavOpen);
    const isMobileNavOpen = useUIStore((state) => state.isMobileNavOpen);

    return (
        <header className={cn('border-border sticky top-0 z-50 border-b bg-(--bg-navbar) backdrop-blur')}>
            <div className={cn('mx-auto flex max-w-7xl flex-col gap-3 p-4 md:px-6')}>
                <div className={cn('flex items-center justify-between gap-3')}>
                    <div className={cn('flex items-center gap-3')}>
                        <Button asChild variant="ghost" size="md" aria-label="Seedcord home">
                            <Link href="/">
                                <SeedcordMark />
                            </Link>
                        </Button>
                    </div>
                    <div className={cn('flex items-center gap-3')}>
                        <div className={cn('flex items-center gap-2')}>
                            <HeaderSearchControls />
                            <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Open navigation menu"
                                aria-haspopup="dialog"
                                aria-expanded={isMobileNavOpen}
                                className={cn('text-(--text) lg:hidden')}
                                onClick={() => setMobileNavOpen(true)}
                            >
                                <Icon icon={Menu} size={20} />
                            </Button>
                            <HeaderSettingsPopover />
                            <Button
                                asChild
                                variant="ghost"
                                size="icon"
                                aria-label="Open GitHub repository"
                                className={cn('text-(--text)')}
                            >
                                <Link href="https://github.com/seedcord/seedcord" target="_blank" rel="noreferrer">
                                    <Icon icon={GithubIcon} size={20} />
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
