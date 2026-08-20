'use client';

import {
    Button,
    CodeBlock,
    Dropdown,
    GithubIcon,
    Icon,
    MobileNavButton,
    MobilePanel,
    Navbar,
    NavTabs,
    SearchIconButton,
    SearchTrigger,
    SegmentedControl,
    SiteSwitcher,
    ThemeToggle,
    cn,
    useMobilePanelContainer,
    useSearchHotkey
} from '@seedcord/ui';
import Link from 'next/link';
import { useCallback, useState } from 'react';

import { TransportControl } from '#components/TransportControl';
import { DOCS_URL, HOME_URL, SITE_URL } from '#lib/site';
import { GUIDE_TABS } from '#lib/tabs';

import { MOCK_SIDEBAR_BY_TAB } from './mockSidebar';
import { SearchPreview } from './SearchPreview';

import type { Transport } from '#components/TransportControl';
import type { DropdownOption, SegmentedControlOption, SiteDestination } from '@seedcord/ui';
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

function sampleCode(transport: Transport): string {
    return [
        `import { SlashHandler, SlashRoute } from '@seedcord/${transport}';`,
        '',
        "@SlashRoute('maintenance')",
        "export class Maintenance extends SlashHandler<'maintenance'> {",
        '    public async execute(): Promise<void> {',
        "        const notify = this.options.getUser('notify');",
        '    }',
        '}'
    ].join('\n');
}

interface SamplePageProps {
    context: SiteContext;
    transport: Transport;
    onTransportChange: (next: Transport) => void;
}

function SamplePage({ context, transport, onTransportChange }: SamplePageProps): ReactElement {
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
                {guide ? (
                    <CodeBlock
                        className={cn('mt-6')}
                        label="src/handlers/Maintenance.ts"
                        representation={{ text: sampleCode(transport), html: null }}
                        actions={<TransportControl value={transport} onChange={onTransportChange} size="sm" />}
                    />
                ) : null}
            </div>
        </div>
    );
}

interface MobileNavProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    activeHref: string;
    onActiveHrefChange: (next: string) => void;
}

function MobileNav({ open, onOpenChange, activeHref, onActiveHrefChange }: MobileNavProps): ReactElement {
    return (
        <MobilePanel
            open={open}
            onOpenChange={onOpenChange}
            title="Navigation"
            description="Slide-in navigation panel for the guide."
            footer={
                <div className={cn('flex items-center justify-end gap-2')}>
                    <ThemeToggle />
                    <GithubLink />
                </div>
            }
        >
            <MobileNavBody activeHref={activeHref} onActiveHrefChange={onActiveHrefChange} />
        </MobilePanel>
    );
}

const TAB_OPTIONS: readonly DropdownOption[] = GUIDE_TABS.map((tab) => ({ value: tab.href, label: tab.label }));

interface MobileNavBodyProps {
    activeHref: string;
    onActiveHrefChange: (next: string) => void;
}

function MobileNavBody({ activeHref, onActiveHrefChange }: MobileNavBodyProps): ReactElement {
    const panelContainer = useMobilePanelContainer();
    const sections = MOCK_SIDEBAR_BY_TAB[activeHref] ?? [];

    return (
        <>
            <Dropdown
                aria-label="Section"
                placeholderLabel="Section"
                value={activeHref}
                options={TAB_OPTIONS}
                onChange={onActiveHrefChange}
                container={panelContainer}
                // without this a long list squashes the trigger to 24px against the panel's 80vh cap
                className={cn('shrink-0')}
            />
            <div className={cn('nice-scroll mt-5 min-h-0 overflow-y-auto overscroll-contain')}>
                {sections.map((section, index) => (
                    <div
                        key={section.label ?? 'top'}
                        className={cn('pb-1', index > 0 && 'mt-4 border-t border-(--border) pt-4')}
                    >
                        {section.label ? <p className={cn(CONTROL_LABEL, 'mb-2 px-3')}>{section.label}</p> : null}
                        {section.links.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={cn(
                                    'block rounded-md px-3 py-2 text-sm text-(--text-muted) hover:bg-(--surface-subtle) hover:text-(--text)'
                                )}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>
                ))}
            </div>
        </>
    );
}

const CONTROL_LABEL = 'text-xs font-semibold tracking-widest text-(--text-faint) uppercase';

interface PreviewControlsProps {
    context: SiteContext;
    onContextChange: (next: SiteContext) => void;
    activeHref: string;
    onActiveHrefChange: (next: string) => void;
}

function PreviewControls({
    context,
    onContextChange,
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
    const [navOpen, setNavOpen] = useState(false);

    const guide = context === 'guide';
    const searchLabel = guide ? 'Search the guide' : 'Search docs';
    const openSearch = useCallback(() => setSearchOpen(true), []);

    useSearchHotkey(useCallback(() => setSearchOpen((prev) => !prev), []));

    return (
        <div className={cn('flex flex-1 flex-col')}>
            <PreviewControls
                context={context}
                onContextChange={setContext}
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
                            <SearchIconButton label={searchLabel} onOpen={openSearch} />
                            <span className={cn('hidden items-center gap-2 lg:flex')}>
                                <ThemeToggle />
                                <GithubLink />
                            </span>
                            {guide ? (
                                <MobileNavButton
                                    open={navOpen}
                                    onOpen={() => setNavOpen(true)}
                                    className={cn('lg:hidden')}
                                />
                            ) : null}
                        </>
                    }
                    tabs={
                        guide ? (
                            <NavTabs
                                items={GUIDE_TABS}
                                activeHref={activeHref}
                                linkAs={Link}
                                className={cn('hidden lg:flex')}
                            />
                        ) : null
                    }
                />
                <SamplePage context={context} transport={transport} onTransportChange={setTransport} />
            </section>

            {guide ? (
                <MobileNav
                    open={navOpen}
                    onOpenChange={setNavOpen}
                    activeHref={activeHref}
                    onActiveHrefChange={setActiveHref}
                />
            ) : null}
            <SearchPreview open={searchOpen} onOpenChange={setSearchOpen} label={searchLabel} />
        </div>
    );
}

export default NavbarPreview;
