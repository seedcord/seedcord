'use client';

import { tw, Badge, Dropdown, Icon, type DropdownGroup, type DropdownOption } from '@seedcord/ui';
import { Globe } from 'lucide-react';
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

const PACKAGE_OPTIONS: DropdownOption[] = [
    { value: 'seedcord', label: 'seedcord' },
    { value: 'services', label: '@seedcord/services' },
    { value: 'utils', label: '@seedcord/utils' },
    { value: 'types', label: '@seedcord/types' },
    { value: 'plugins', label: '@seedcord/plugins' }
];

const VERSION_OPTIONS: DropdownOption[] = [
    { value: '0.10.6', label: 'v0.10.6' },
    { value: '0.10.5', label: 'v0.10.5' },
    { value: '0.10.4', label: 'v0.10.4' },
    { value: '0.10.3', label: 'v0.10.3' }
];

const VERSION_GROUPS: DropdownGroup[] = [
    {
        id: 'stable',
        options: [
            {
                value: '0.10.6',
                label: 'v0.10.6',
                trailing: (
                    <Badge tone="accent" variant="chip">
                        latest
                    </Badge>
                )
            },
            { value: '0.9.4', label: 'v0.9.4' },
            { value: '0.8.7', label: 'v0.8.7' }
        ]
    },
    {
        id: 'prerelease',
        label: 'pre-release',
        options: [{ value: '0.11.0-next.1', label: 'v0.11.0-next.1' }]
    }
];

const LOCALE_OPTIONS: DropdownOption[] = [
    { value: 'en-US', label: 'English (United States)' },
    { value: 'en-GB', label: 'English (United Kingdom)' },
    { value: 'es-ES', label: 'Español (España)' },
    { value: 'ja-JP', label: '日本語 (日本)' }
];

function SidebarSelectMock(): ReactElement {
    const [pkg, setPkg] = useState('seedcord');
    const [version, setVersion] = useState('0.10.6');
    return (
        <div className={tw`max-w-xs space-y-3`}>
            <div className={tw`space-y-1`}>
                <p className={tw`text-subtle text-xs font-semibold tracking-wide uppercase`}>Package</p>
                <Dropdown placeholderLabel="Package" value={pkg} options={PACKAGE_OPTIONS} onChange={setPkg} />
            </div>
            <div className={tw`space-y-1`}>
                <p className={tw`text-subtle text-xs font-semibold tracking-wide uppercase`}>Version</p>
                <Dropdown placeholderLabel="Version" value={version} options={VERSION_OPTIONS} onChange={setVersion} />
            </div>
        </div>
    );
}

function VersionGroupsMock(): ReactElement {
    const [version, setVersion] = useState('0.10.6');
    return (
        <div className={tw`max-w-xs space-y-1`}>
            <p className={tw`text-subtle text-xs font-semibold tracking-wide uppercase`}>Version</p>
            <Dropdown placeholderLabel="Version" value={version} groups={VERSION_GROUPS} onChange={setVersion} />
        </div>
    );
}

function SizesRow(): ReactElement {
    const [sm, setSm] = useState('en-US');
    const [md, setMd] = useState('en-US');
    return (
        <div className={tw`flex flex-col gap-3 max-w-sm`}>
            <div className={tw`space-y-1`}>
                <p className={tw`text-subtle text-xs tracking-wide`}>fieldSize=&quot;sm&quot;</p>
                <Dropdown
                    placeholderLabel="Locale"
                    value={sm}
                    options={LOCALE_OPTIONS}
                    onChange={setSm}
                    fieldSize="sm"
                />
            </div>
            <div className={tw`space-y-1`}>
                <p className={tw`text-subtle text-xs tracking-wide`}>fieldSize=&quot;md&quot; (default)</p>
                <Dropdown
                    placeholderLabel="Locale"
                    value={md}
                    options={LOCALE_OPTIONS}
                    onChange={setMd}
                    fieldSize="md"
                />
            </div>
        </div>
    );
}

function LeadingIconRow(): ReactElement {
    const [val, setVal] = useState('en-US');
    return (
        <div className={tw`max-w-xs`}>
            <Dropdown
                placeholderLabel="Locale"
                value={val}
                options={LOCALE_OPTIONS}
                onChange={setVal}
                leadingIcon={<Icon icon={Globe} size={16} />}
            />
        </div>
    );
}

function StatesRow(): ReactElement {
    const [val, setVal] = useState('');
    return (
        <div className={tw`flex flex-col gap-3 max-w-sm`}>
            <div className={tw`space-y-1`}>
                <p className={tw`text-subtle text-xs tracking-wide`}>Placeholder (no value selected)</p>
                <Dropdown placeholderLabel="Pick a locale" value={val} options={LOCALE_OPTIONS} onChange={setVal} />
            </div>
            <div className={tw`space-y-1`}>
                <p className={tw`text-subtle text-xs tracking-wide`}>error=true</p>
                <Dropdown
                    placeholderLabel="Pick a locale"
                    value=""
                    options={LOCALE_OPTIONS}
                    onChange={() => undefined}
                    error
                />
            </div>
            <div className={tw`space-y-1`}>
                <p className={tw`text-subtle text-xs tracking-wide`}>disabled</p>
                <Dropdown
                    placeholderLabel="Pick a locale"
                    value="en-US"
                    options={LOCALE_OPTIONS}
                    onChange={() => undefined}
                    disabled
                />
            </div>
        </div>
    );
}

function LongListRow(): ReactElement {
    const [val, setVal] = useState('opt-1');
    const longOptions: DropdownOption[] = Array.from({ length: 24 }, (_, i) => ({
        value: `opt-${i + 1}`,
        label: `Long-list option ${i + 1}`
    }));
    return (
        <div className={tw`max-w-xs`}>
            <Dropdown placeholderLabel="Many options" value={val} options={longOptions} onChange={setVal} />
        </div>
    );
}

const SCOPE_OPTIONS: DropdownOption[] = [
    { value: 'all', label: 'All packages' },
    { value: 'seedcord', label: 'seedcord' },
    { value: 'services', label: '@seedcord/services' }
];

const KIND_OPTIONS: DropdownOption[] = [
    { value: 'all', label: 'All kinds' },
    { value: 'class', label: 'Classes' },
    { value: 'function', label: 'Functions' }
];

function GhostVariantRow(): ReactElement {
    const [scope, setScope] = useState('all');
    const [kind, setKind] = useState('all');
    return (
        <div
            className={tw`flex max-w-md items-center gap-1 rounded-lg border border-(--border) bg-surface-subtle px-3 py-2`}
        >
            <Dropdown
                variant="ghost"
                placeholderLabel="All packages"
                value={scope}
                options={SCOPE_OPTIONS}
                onChange={setScope}
                aria-label="Scope"
            />
            <span className={tw`text-(--text-faint)`}>/</span>
            <Dropdown
                variant="ghost"
                placeholderLabel="All kinds"
                value={kind}
                options={KIND_OPTIONS}
                onChange={setKind}
                aria-label="Kind"
            />
        </div>
    );
}

function DropdownPage(): ReactElement {
    return (
        <div className={tw`space-y-10 pb-32`}>
            <header className={tw`space-y-2`}>
                <h1 className={tw`text-2xl font-semibold tracking-tight text-(--text)`}>Dropdown</h1>
                <p className={tw`text-subtle text-sm`}>
                    Listbox-over-Popover single-value picker. Built on `@seedcord/ui` Popover + a hand-rolled `&lt;ul
                    role=&quot;listbox&quot;&gt;` with `&lt;button role=&quot;option&quot;&gt;` rows. Replaces the
                    semantically-wrong `@radix-ui/react-dropdown-menu` usage in SidebarSelect (menu vs listbox).
                </p>
            </header>
            <DevSection title="SidebarSelect mock (real-world consumer cluster)">
                <SidebarSelectMock />
            </DevSection>
            <DevSection title="Grouped version picker (stable desc, pre-release separator, latest badge)">
                <VersionGroupsMock />
            </DevSection>
            <DevSection title="Sizes (sm + md)">
                <SizesRow />
            </DevSection>
            <DevSection title="With leading icon">
                <LeadingIconRow />
            </DevSection>
            <DevSection title="States (placeholder / error / disabled)">
                <StatesRow />
            </DevSection>
            <DevSection title="Long option list (scrolls within max-h-72)">
                <LongListRow />
            </DevSection>
            <DevSection title="Ghost variant (borderless, inline in a bar)">
                <GhostVariantRow />
            </DevSection>
        </div>
    );
}

export default DropdownPage;
