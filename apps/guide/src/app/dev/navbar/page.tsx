'use client';

import {
    Button,
    GithubIcon,
    Icon,
    Navbar,
    NavTabs,
    SearchDialog,
    SearchField,
    SearchTrigger,
    SegmentedControl,
    SettingsPopover,
    SiteSwitcher,
    ThemeToggle,
    cn,
    useActiveRowScroll,
    useRovingList,
    useSearchHotkey
} from '@seedcord/ui';
import Link from 'next/link';
import { useCallback, useMemo, useRef, useState } from 'react';

import { TransportControl } from '#components/TransportControl';
import { DOCS_URL, HOME_URL, SITE_URL } from '#lib/site';
import { GUIDE_TABS } from '#lib/tabs';

import { MOCK_SEARCH_RESULTS } from './mockSearch';

import type { MockSearchResult } from './mockSearch';

import type { Transport } from '#components/TransportControl';
import type { SegmentedControlOption, SiteDestination } from '@seedcord/ui';
import type { ReactElement } from 'react';

type SiteContext = 'guide' | 'reference';

const CONTEXT_OPTIONS: readonly SegmentedControlOption<SiteContext>[] = [
    { value: 'guide', label: 'guide' },
    { value: 'reference', label: 'reference' }
];

type TransportPlacement = 'tabs' | 'settings';

const PLACEMENT_OPTIONS: readonly SegmentedControlOption<TransportPlacement>[] = [
    { value: 'tabs', label: 'in the tabs row' },
    { value: 'settings', label: 'in settings' }
];

const GUIDE_DESTINATIONS: readonly SiteDestination[] = [
    { label: 'Home', href: HOME_URL },
    { label: 'Guide', href: SITE_URL, current: true },
    { label: 'Reference', href: DOCS_URL }
];

const REFERENCE_DESTINATIONS: readonly SiteDestination[] = [
    { label: 'Home', href: HOME_URL },
    { label: 'Guide', href: SITE_URL },
    { label: 'Reference', href: DOCS_URL, current: true }
];

function GithubLink(): ReactElement {
    return (
        <Button asChild variant="ghost" size="icon" aria-label="Open GitHub repository" className={cn('text-(--text)')}>
            <a href="https://github.com/seedcord/seedcord" target="_blank" rel="noreferrer">
                <Icon icon={GithubIcon} size={20} />
            </a>
        </Button>
    );
}

function SamplePage({ context }: { context: SiteContext }): ReactElement {
    const guide = context === 'guide';

    return (
        <div className={cn('mx-auto w-full max-w-(--shell-max) px-4 py-12 md:px-6')}>
            <div className={cn('max-w-3xl')}>
                <h1 className={cn('font-display text-4xl/tight font-semibold text-(--text)')}>
                    {guide ? 'Options that type themselves' : '@seedcord/core'}
                </h1>
                <p className={cn('mt-3 text-lg/relaxed text-(--text-muted)')}>
                    {guide
                        ? "You declare a command's options once. Codegen reads that declaration and types this.options, so a required option comes back non-null."
                        : 'The transport-agnostic core every seedcord bot builds on, shared by the gateway and http packages.'}
                </p>
                <p className={cn('mt-6 text-sm/relaxed text-(--text-muted)')}>
                    Body copy sits here so the bar above has something to sit against. The point of this block is the
                    spacing between the bar and the first line of a page, and how the title reads under it.
                </p>
            </div>
        </div>
    );
}

const SEARCH_LISTBOX_ID = 'guide-search-results';

interface SearchPreviewProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    label: string;
}

function rowId(id: string): string {
    return `guide-search-${id}`;
}

function SearchPreview({ open, onOpenChange, label }: SearchPreviewProps): ReactElement {
    const inputRef = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState('');

    const matches = useMemo(
        () =>
            MOCK_SEARCH_RESULTS.filter((result) =>
                `${result.title} ${result.tab}`.toLowerCase().includes(query.trim().toLowerCase())
            ),
        [query]
    );
    const expanded = query.trim().length > 0 && matches.length > 0;
    const close = (): void => onOpenChange(false);

    const { activeIndex, isFirst, isLast, setActiveIndex, onKeyDown } = useRovingList({
        items: matches,
        onSelect: close
    });
    const active = matches[activeIndex];

    return (
        <SearchDialog
            open={open}
            onOpenChange={onOpenChange}
            onClose={close}
            title="Search the guide"
            description="Search guide pages by title and section."
            field={
                <SearchField
                    inputRef={inputRef}
                    value={query}
                    onValueChange={setQuery}
                    onKeyDown={onKeyDown}
                    onClose={close}
                    label={label}
                    closeLabel="Close search"
                    listboxId={SEARCH_LISTBOX_ID}
                    listExpanded={expanded}
                    activeId={active ? rowId(active.id) : undefined}
                />
            }
        >
            {expanded ? (
                <SearchResults
                    matches={matches}
                    activeIndex={activeIndex}
                    isFirst={isFirst}
                    isLast={isLast}
                    onActivate={setActiveIndex}
                />
            ) : null}
        </SearchDialog>
    );
}

interface SearchResultsProps {
    matches: readonly MockSearchResult[];
    activeIndex: number;
    isFirst: boolean;
    isLast: boolean;
    onActivate: (index: number) => void;
}

function SearchResults({ matches, activeIndex, isFirst, isLast, onActivate }: SearchResultsProps): ReactElement {
    const active = matches[activeIndex];
    useActiveRowScroll(active ? rowId(active.id) : undefined, isFirst, isLast);

    return (
        <div id={SEARCH_LISTBOX_ID} role="listbox" aria-label="Search results" className={cn('py-3')}>
            {matches.map((result, index) => (
                <div
                    key={result.id}
                    id={rowId(result.id)}
                    role="option"
                    aria-selected={index === activeIndex}
                    onMouseEnter={() => onActivate(index)}
                    className={cn('mx-2 rounded-md px-3 py-2', index === activeIndex && 'bg-(--bg-accent-b-moderate)')}
                >
                    <div className={cn('flex items-baseline gap-2')}>
                        <span className={cn('text-sm font-semibold text-(--text)')}>{result.title}</span>
                        <span className={cn('text-xs text-(--text-faint)')}>{result.tab}</span>
                    </div>
                    <p className={cn('mt-0.5 text-xs text-(--text-muted)')}>{result.excerpt}</p>
                </div>
            ))}
        </div>
    );
}

const CONTROL_LABEL = 'text-xs font-semibold tracking-widest text-(--text-faint) uppercase';

interface PreviewControlsProps {
    context: SiteContext;
    onContextChange: (next: SiteContext) => void;
    placement: TransportPlacement;
    onPlacementChange: (next: TransportPlacement) => void;
    activeHref: string;
    onActiveHrefChange: (next: string) => void;
}

function PreviewControls({
    context,
    onContextChange,
    placement,
    onPlacementChange,
    activeHref,
    onActiveHrefChange
}: PreviewControlsProps): ReactElement {
    return (
        <div className={cn('flex flex-wrap items-center gap-4 border-b border-(--border) px-6 py-4')}>
            <span className={cn(CONTROL_LABEL)}>site</span>
            <SegmentedControl
                options={CONTEXT_OPTIONS}
                value={context}
                onChange={onContextChange}
                size="sm"
                aria-label="Preview site context"
            />
            {context === 'guide' ? (
                <>
                    <span className={cn(CONTROL_LABEL)}>transport</span>
                    <SegmentedControl
                        options={PLACEMENT_OPTIONS}
                        value={placement}
                        onChange={onPlacementChange}
                        size="sm"
                        aria-label="Where the transport control sits"
                    />
                    <span className={cn(CONTROL_LABEL)}>active tab</span>
                    <div className={cn('flex flex-wrap gap-1')}>
                        {GUIDE_TABS.map((tab) => (
                            <Button
                                key={tab.href}
                                variant={tab.href === activeHref ? 'primary' : 'outline'}
                                size="sm"
                                onClick={() => onActiveHrefChange(tab.href)}
                            >
                                {tab.label}
                            </Button>
                        ))}
                    </div>
                </>
            ) : null}
        </div>
    );
}

function NavbarPreview(): ReactElement {
    const [context, setContext] = useState<SiteContext>('guide');
    const [transport, setTransport] = useState<Transport>('gateway');
    const [activeHref, setActiveHref] = useState('/commands');
    const [searchOpen, setSearchOpen] = useState(false);
    const [transportPlacement, setTransportPlacement] = useState<TransportPlacement>('tabs');

    const guide = context === 'guide';
    const searchLabel = guide ? 'Search the guide' : 'Search docs';
    const openSearch = useCallback(() => setSearchOpen(true), []);
    const transportProps = { value: transport, onChange: setTransport };

    useSearchHotkey(useCallback(() => setSearchOpen((prev) => !prev), []));

    return (
        <div className={cn('flex flex-1 flex-col')}>
            <PreviewControls
                context={context}
                onContextChange={setContext}
                placement={transportPlacement}
                onPlacementChange={setTransportPlacement}
                activeHref={activeHref}
                onActiveHrefChange={setActiveHref}
            />

            <section id="bar" className={cn('flex flex-1 flex-col')}>
                <Navbar
                    className={cn('relative')}
                    mark={
                        <SiteSwitcher
                            site={guide ? 'guide' : 'docs'}
                            destinations={guide ? GUIDE_DESTINATIONS : REFERENCE_DESTINATIONS}
                            linkAs={Link}
                        />
                    }
                    center={<SearchTrigger label={searchLabel} onOpen={openSearch} />}
                    actions={
                        <>
                            <ThemeToggle />
                            <SettingsPopover label="Open guide settings">
                                {transportPlacement === 'settings' ? (
                                    <div className={cn('flex items-center justify-between gap-3')}>
                                        <span className={cn('text-(--text)')}>Transport</span>
                                        <TransportControl {...transportProps} />
                                    </div>
                                ) : (
                                    <p className={cn('text-(--text-muted)')}>Nothing here yet.</p>
                                )}
                            </SettingsPopover>
                            <GithubLink />
                        </>
                    }
                    tabs={
                        guide ? (
                            <NavTabs
                                items={GUIDE_TABS}
                                activeHref={activeHref}
                                linkAs={Link}
                                trailing={
                                    transportPlacement === 'tabs' ? (
                                        <TransportControl {...transportProps} size="sm" />
                                    ) : null
                                }
                            />
                        ) : null
                    }
                />
                <SamplePage context={context} />
            </section>

            <SearchPreview open={searchOpen} onOpenChange={setSearchOpen} label={searchLabel} />
        </div>
    );
}

export default NavbarPreview;
