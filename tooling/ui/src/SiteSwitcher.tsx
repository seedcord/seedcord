'use client';

import { ArrowUpRight, Check } from 'lucide-react';
import { useId } from 'react';

import { CaretTrigger } from './CaretTrigger';
import { HotkeyHint } from './HotkeyHint';
import { cn } from './lib/cn';
import { PlainLink } from './lib/navLink';
import { useRovingList } from './lib/useRovingList';
import { SWITCH_SITE } from './lib/useSiteHotkeys';
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
    open: boolean;
    onOpenChange: (open: boolean) => void;
    // closing leaves focus on the page when false
    returnFocus: boolean;
    linkAs?: NavLinkComponent | undefined;
}

const rowClassName = cn(
    'flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-sm',
    'transition-colors duration-100 ease-out'
);

interface SiteOptionProps {
    destination: SiteDestination;
    id: string;
    active: boolean;
    onPoint: () => void;
    onOpen: () => void;
}

function CurrentSite({ label }: { label: string }): ReactElement {
    return (
        <span
            role="option"
            aria-selected={false}
            aria-disabled
            aria-current="page"
            className={cn(rowClassName, 'font-semibold text-(--text)')}
        >
            {label}
            <Check size={16} aria-hidden className={cn('text-(--rind)')} />
        </span>
    );
}

function SiteOption({ destination, id, active, onPoint, onOpen }: SiteOptionProps): ReactElement {
    return (
        <a
            id={id}
            role="option"
            aria-selected={active}
            tabIndex={-1}
            href={destination.href}
            target="_blank"
            rel="noreferrer"
            onPointerMove={onPoint}
            onClick={onOpen}
            className={cn(rowClassName, 'text-(--text) aria-selected:bg-(--bg-accent-b-moderate)')}
        >
            {destination.label}
            <ArrowUpRight size={14} aria-hidden className={cn('text-(--text-faint)')} />
        </a>
    );
}

interface SiteListProps {
    id: string;
    destinations: readonly SiteDestination[];
    onClose: () => void;
}

function SiteList({ id, destinations, onClose }: SiteListProps): ReactElement {
    const others = destinations.filter((destination) => destination.current !== true);
    const roving = useRovingList({
        groups: [{ items: others, loading: false }],
        onSelect: (destination) => {
            globalThis.open(destination.href, '_blank', 'noreferrer');
            onClose();
        }
    });
    const optionId = (destination: SiteDestination): string => `${id}-${others.indexOf(destination)}`;

    return (
        // radix focuses the first tabbable element on open
        <ul
            id={id}
            role="listbox"
            aria-label="Sites"
            tabIndex={0}
            aria-activedescendant={roving.active === undefined ? undefined : optionId(roving.active)}
            onKeyDown={roving.onKeyDown}
            className={cn('space-y-0.5 focus-visible:outline-hidden')}
        >
            {destinations.map((destination) => (
                <li key={destination.href} role="presentation">
                    {destination.current === true ? (
                        <CurrentSite label={destination.label} />
                    ) : (
                        <SiteOption
                            destination={destination}
                            id={optionId(destination)}
                            active={roving.isActive(destination)}
                            onPoint={() => roving.pointAt(destination)}
                            onOpen={onClose}
                        />
                    )}
                </li>
            ))}
        </ul>
    );
}

export function SiteSwitcher({
    site,
    destinations,
    open,
    onOpenChange,
    returnFocus,
    linkAs
}: SiteSwitcherProps): ReactElement {
    const Link = linkAs ?? PlainLink;
    const listId = useId();

    return (
        <div className={cn('flex shrink-0 items-center gap-2.5')}>
            <Link href="/" className={cn('rounded-md')}>
                <SiteMark />
            </Link>
            <span aria-hidden className={cn('text-lg text-(--text-faint)')}>
                /
            </span>
            <Popover open={open} onOpenChange={onOpenChange}>
                <HotkeyHint hotkey={SWITCH_SITE}>
                    <PopoverTrigger asChild>
                        <CaretTrigger
                            label={site}
                            open={open}
                            variant="ghost"
                            aria-haspopup="listbox"
                            aria-controls={listId}
                            aria-label={`${site}, ${SWITCH_SITE.description}`}
                            className={cn('font-display text-lg')}
                        />
                    </PopoverTrigger>
                </HotkeyHint>
                <PopoverContent
                    align="start"
                    sideOffset={10}
                    className={cn('w-56 p-1')}
                    onCloseAutoFocus={returnFocus ? undefined : (event) => event.preventDefault()}
                >
                    <SiteList id={listId} destinations={destinations} onClose={() => onOpenChange(false)} />
                </PopoverContent>
            </Popover>
        </div>
    );
}
