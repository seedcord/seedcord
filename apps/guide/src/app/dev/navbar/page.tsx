'use client';

import {
    Button,
    GithubIcon,
    Icon,
    Navbar,
    NavTabs,
    SearchTrigger,
    SegmentedControl,
    SiteSwitcher,
    ThemeToggle,
    cn
} from '@seedcord/ui';
import Link from 'next/link';
import { useState } from 'react';

import { TransportControl } from '#components/TransportControl';
import { DOCS_URL, HOME_URL, SITE_URL } from '#lib/site';
import { GUIDE_TABS } from '#lib/tabs';

import type { Transport } from '#components/TransportControl';
import type { SegmentedControlOption, SiteDestination } from '@seedcord/ui';
import type { ReactElement } from 'react';

type SiteContext = 'guide' | 'reference';

const CONTEXT_OPTIONS: readonly SegmentedControlOption<SiteContext>[] = [
    { value: 'guide', label: 'guide' },
    { value: 'reference', label: 'reference' }
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

function NavbarPreview(): ReactElement {
    const [context, setContext] = useState<SiteContext>('guide');
    const [transport, setTransport] = useState<Transport>('gateway');
    const [activeHref, setActiveHref] = useState('/commands');

    const guide = context === 'guide';

    return (
        <div className={cn('flex flex-1 flex-col')}>
            <div className={cn('flex flex-wrap items-center gap-4 border-b border-(--border) px-6 py-4')}>
                <span className={cn('text-xs font-semibold tracking-widest text-(--text-faint) uppercase')}>site</span>
                <SegmentedControl
                    options={CONTEXT_OPTIONS}
                    value={context}
                    onChange={setContext}
                    size="sm"
                    aria-label="Preview site context"
                />
                {guide ? (
                    <>
                        <span className={cn('text-xs font-semibold tracking-widest text-(--text-faint) uppercase')}>
                            active tab
                        </span>
                        <div className={cn('flex flex-wrap gap-1')}>
                            {GUIDE_TABS.map((tab) => (
                                <Button
                                    key={tab.href}
                                    variant={tab.href === activeHref ? 'primary' : 'outline'}
                                    size="sm"
                                    onClick={() => setActiveHref(tab.href)}
                                >
                                    {tab.label}
                                </Button>
                            ))}
                        </div>
                    </>
                ) : null}
            </div>

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
                    search={<SearchTrigger label={guide ? 'Search the guide' : 'Search docs'} onOpen={() => {}} />}
                    actions={
                        <>
                            {guide ? <TransportControl value={transport} onChange={setTransport} /> : null}
                            <ThemeToggle />
                            <GithubLink />
                        </>
                    }
                    tabs={guide ? <NavTabs items={GUIDE_TABS} activeHref={activeHref} linkAs={Link} /> : null}
                />
                <SamplePage context={context} />
            </section>
        </div>
    );
}

export default NavbarPreview;
