'use client';

import { ArrowUpRight, Check, ChevronRight } from 'lucide-react';
import { useState } from 'react';

import { cn } from './lib/cn';
import { PlainLink } from './lib/navLink';
import { Popover, PopoverContent, PopoverTrigger } from './Popover';
import { SiteMark } from './SiteMark';

import type { NavLinkComponent } from './lib/navLink';
import type { ReactElement } from 'react';

export interface SiteDestination {
    label: string;
    href: string;
    current?: boolean | undefined;
}

export interface SiteSwitcherProps {
    site: string;
    destinations: readonly SiteDestination[];
    linkAs?: NavLinkComponent | undefined;
}

const rowClassName = cn(
    'flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-sm',
    'transition-colors duration-100 ease-out'
);

export function SiteSwitcher({ site, destinations, linkAs }: SiteSwitcherProps): ReactElement {
    const [open, setOpen] = useState(false);
    const Link = linkAs ?? PlainLink;

    return (
        <div className={cn('flex shrink-0 items-center gap-2.5')}>
            <Link href="/" className={cn('rounded-md')}>
                <SiteMark />
            </Link>
            <span aria-hidden className={cn('text-lg text-(--text-faint)')}>
                /
            </span>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        aria-label="Switch site"
                        className={cn(
                            'inline-flex items-center gap-1 rounded-md px-1 py-0.5',
                            'font-display text-lg font-medium text-(--text-muted)',
                            'transition-colors duration-150 ease-out hover:text-(--text)',
                            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-outline-b)',
                            'data-[state=open]:text-(--rind)'
                        )}
                    >
                        {site}
                        <ChevronRight
                            size={16}
                            aria-hidden
                            className={cn('shrink-0 transition-transform duration-200 ease-out', open && 'rotate-90')}
                        />
                    </button>
                </PopoverTrigger>
                <PopoverContent align="start" sideOffset={10} className={cn('w-56 p-1')}>
                    <ul className={cn('space-y-0.5')}>
                        {destinations.map((destination) => (
                            <li key={destination.href}>
                                {destination.current ? (
                                    <span className={cn(rowClassName, 'font-semibold text-(--text)')}>
                                        {destination.label}
                                        <Check size={16} aria-hidden className={cn('text-(--rind)')} />
                                    </span>
                                ) : (
                                    <a
                                        href={destination.href}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={cn(
                                            rowClassName,
                                            'text-(--text) hover:bg-(--bg-accent-b-moderate)',
                                            'focus-visible:bg-(--bg-accent-b-moderate) focus-visible:outline-hidden'
                                        )}
                                    >
                                        {destination.label}
                                        <ArrowUpRight size={14} aria-hidden className={cn('text-(--text-faint)')} />
                                    </a>
                                )}
                            </li>
                        ))}
                    </ul>
                </PopoverContent>
            </Popover>
        </div>
    );
}
