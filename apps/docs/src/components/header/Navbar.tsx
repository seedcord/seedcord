'use client';

import Link from 'next/link';

import Button from '@ui/Button';
import GithubIcon from '@ui/GithubIcon';
import Icon from '@ui/Icon';

import HeaderSettingsPopover from './HeaderSettingsPopover';
import HeaderSearchControls from './search-controls/HeaderSearchControls';
import SeedcordMark from './SeedcordMark';

import type { ReactElement } from 'react';

function Navbar(): ReactElement {
    return (
        <header className="border-border sticky top-0 z-50 border-b bg-(--bg-navbar) backdrop-blur">
            <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 md:px-6">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/"
                            className="group flex cursor-pointer items-center rounded-2xl border border-transparent px-3 py-1.5 text-(--text) transition hover:border-(--border-70-transparent) hover:bg-(--bg-light-moderate) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--outline-accent-a-subtle)"
                            aria-label="Seedcord home"
                        >
                            <SeedcordMark />
                        </Link>
                        <nav className="hidden items-center gap-2 lg:flex" aria-label="Primary navigation">
                            <Link
                                href="/docs"
                                className="text-subtle inline-flex items-center gap-2 rounded-xl border border-transparent px-3 py-1.5 text-sm font-semibold transition hover:border-(--border-accent-a-subtle) hover:bg-(--surface-accent-a-subtle) hover:text-(--text) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--outline-accent-a-subtle)"
                            >
                                Docs home
                            </Link>
                        </nav>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <HeaderSearchControls />
                            <HeaderSettingsPopover />
                            <Button
                                asChild
                                variant="ghost"
                                size="icon"
                                aria-label="Open GitHub repository"
                                className="text-(--text)"
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

export default Navbar;
