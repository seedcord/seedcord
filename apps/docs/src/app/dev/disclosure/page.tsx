'use client';

import { Button, Disclosure, DisclosureChevron, DisclosurePanel, DisclosureTrigger, Icon, tw } from '@seedcord/ui';
import { Braces, FunctionSquare, SquareStack } from 'lucide-react';
import { useState } from 'react';

import type { ReactElement, ReactNode } from 'react';

function DevSection({ title, children }: { title: string; children: ReactNode }): ReactElement {
    return (
        <section className={tw`space-y-3`}>
            <h2 className={tw`text-subtle text-xs font-semibold tracking-widest uppercase`}>{title}</h2>
            {children}
        </section>
    );
}

function FillerList(): ReactElement {
    return (
        <ul className={tw`mt-3 space-y-2 text-sm`}>
            <li>First item in the panel</li>
            <li>Second item — panels animate height + opacity together</li>
            <li>Third item — the grid-rows-[0fr → 1fr] trick handles the height</li>
            <li>Fourth item with a longer label so the row count is realistic</li>
        </ul>
    );
}

function BasicRow(): ReactElement {
    return (
        <Disclosure defaultOpen className={tw`max-w-md space-y-2`}>
            <DisclosureTrigger
                className={tw`rounded-lg border border-(--border) bg-(--surface-subtle) px-3 py-2 text-sm font-semibold text-(--text)`}
            >
                <span>Toggle the panel</span>
                <DisclosureChevron className={tw`ml-auto`} />
            </DisclosureTrigger>
            <DisclosurePanel>
                <FillerList />
            </DisclosurePanel>
        </Disclosure>
    );
}

function DefaultOpenVsClosedRow(): ReactElement {
    return (
        <div className={tw`grid max-w-md gap-3`}>
            <Disclosure defaultOpen className={tw`space-y-2`}>
                <DisclosureTrigger className={tw`text-sm font-semibold text-(--text)`}>
                    <DisclosureChevron />
                    <span>defaultOpen — already expanded</span>
                </DisclosureTrigger>
                <DisclosurePanel>
                    <p className={tw`text-subtle pt-2 text-xs`}>Body content for the default-open disclosure.</p>
                </DisclosurePanel>
            </Disclosure>
            <Disclosure className={tw`space-y-2`}>
                <DisclosureTrigger className={tw`text-sm font-semibold text-(--text)`}>
                    <DisclosureChevron />
                    <span>default closed — click to expand</span>
                </DisclosureTrigger>
                <DisclosurePanel>
                    <p className={tw`text-subtle pt-2 text-xs`}>Body content for the default-closed disclosure.</p>
                </DisclosurePanel>
            </Disclosure>
        </div>
    );
}

function ControlledRow(): ReactElement {
    const [open, setOpen] = useState(false);
    return (
        <div className={tw`max-w-md space-y-3`}>
            <div className={tw`flex items-center gap-3`}>
                <Button variant="outline" size="sm" onClick={() => setOpen((prev) => !prev)}>
                    Toggle externally
                </Button>
                <span className={tw`text-subtle text-xs`}>open = {String(open)}</span>
            </div>
            <Disclosure open={open} onOpenChange={setOpen} className={tw`space-y-2`}>
                <DisclosureTrigger className={tw`text-sm font-semibold text-(--text)`}>
                    <DisclosureChevron />
                    <span>Controlled by parent state</span>
                </DisclosureTrigger>
                <DisclosurePanel>
                    <p className={tw`text-subtle pt-2 text-xs`}>
                        Parent owns the open state. Trigger and external button both write to it.
                    </p>
                </DisclosurePanel>
            </Disclosure>
        </div>
    );
}

function SidebarCategoryListMock(): ReactElement {
    const categories = [
        { title: 'Classes', icon: SquareStack, items: ['Seedcord', 'Bot', 'Plugin'] },
        { title: 'Functions', icon: FunctionSquare, items: ['createBot', 'registerPlugin'] },
        { title: 'Types', icon: Braces, items: ['BotConfig', 'PluginManifest'] }
    ];
    return (
        <div className={tw`flex max-w-xs flex-col gap-6 pr-1 pb-2`}>
            {categories.map((category) => (
                <Disclosure key={category.title} defaultOpen className={tw`space-y-3`}>
                    <DisclosureTrigger className={tw`px-1 text-xs font-semibold tracking-wide text-(--text) uppercase`}>
                        <span className={tw`flex items-center gap-2`}>
                            <Icon icon={category.icon} size={16} />
                            <span>{category.title}</span>
                        </span>
                        <DisclosureChevron className={tw`ml-2`} />
                    </DisclosureTrigger>
                    <DisclosurePanel>
                        <ul className={tw`flex flex-col gap-1 pt-3 text-sm`}>
                            {category.items.map((item) => (
                                <li key={item} className={tw`text-subtle px-2 py-1 hover:text-(--text)`}>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </DisclosurePanel>
                </Disclosure>
            ))}
        </div>
    );
}

function StorageDemoRow(): ReactElement {
    return (
        <div className={tw`max-w-md space-y-2`}>
            <p className={tw`text-subtle text-xs`}>
                Reload the page after toggling — state persists via localStorage under the storageKey.
            </p>
            <Disclosure storageKey="seedcord-dev-disclosure-demo" className={tw`space-y-2`}>
                <DisclosureTrigger className={tw`text-sm font-semibold text-(--text)`}>
                    <DisclosureChevron />
                    <span>Persists across reloads</span>
                </DisclosureTrigger>
                <DisclosurePanel>
                    <p className={tw`text-subtle pt-2 text-xs`}>storageKey=&quot;seedcord-dev-disclosure-demo&quot;</p>
                </DisclosurePanel>
            </Disclosure>
        </div>
    );
}

function DisclosurePage(): ReactElement {
    return (
        <div className={tw`space-y-10 pb-32`}>
            <header className={tw`space-y-2`}>
                <h1 className={tw`text-2xl font-semibold tracking-tight text-(--text)`}>Disclosure</h1>
                <p className={tw`text-subtle text-sm`}>
                    Headless compound: Disclosure + DisclosureTrigger + DisclosurePanel + DisclosureChevron. Trigger is
                    fully consumer-styled. Panel animates via CSS grid-rows-[0fr → 1fr] (no JS, no motion library
                    needed). Chevron auto-rotates via data-state. Supports uncontrolled (defaultOpen), controlled (open
                    + onOpenChange), and localStorage-persisted (storageKey) modes.
                </p>
            </header>
            <DevSection title="Basic">
                <BasicRow />
            </DevSection>
            <DevSection title="defaultOpen vs default closed">
                <DefaultOpenVsClosedRow />
            </DevSection>
            <DevSection title="Controlled state">
                <ControlledRow />
            </DevSection>
            <DevSection title="SidebarCategoryList mock (real-world consumer)">
                <SidebarCategoryListMock />
            </DevSection>
            <DevSection title="localStorage persistence">
                <StorageDemoRow />
            </DevSection>
        </div>
    );
}

export default DisclosurePage;
