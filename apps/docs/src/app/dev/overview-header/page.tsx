'use client';

import { SegmentedControl, cn, type SegmentedControlOption } from '@seedcord/ui';
import { useState } from 'react';

import type { ReactElement, ReactNode } from 'react';

const TAB_OPTIONS: SegmentedControlOption<'overview' | 'reference'>[] = [
    { value: 'overview', label: 'Overview' },
    { value: 'reference', label: 'Reference' }
];

function Tabs(): ReactElement {
    const [tab, setTab] = useState<'overview' | 'reference'>('overview');
    return <SegmentedControl options={TAB_OPTIONS} value={tab} onChange={setTab} size="md" aria-label="Package view" />;
}

function ContentStandin(): ReactElement {
    return (
        <div className={cn('space-y-4 opacity-70')}>
            <div className={cn('mx-auto h-28 w-full max-w-lg rounded-md bg-(--surface-subtle)')} />
            <div className={cn('space-y-2')}>
                <div className={cn('h-4 w-3/4 rounded bg-(--surface-subtle)')} />
                <div className={cn('h-4 w-2/3 rounded bg-(--surface-subtle)')} />
            </div>
        </div>
    );
}

function Option({ title, note, children }: { title: string; note: string; children: ReactNode }): ReactElement {
    return (
        <section className={cn('space-y-3')}>
            <div className={cn('space-y-1')}>
                <h2 className={cn('text-subtle text-xs font-semibold tracking-widest uppercase')}>{title}</h2>
                <p className={cn('text-xs text-(--text-faint)')}>{note}</p>
            </div>
            <div className={cn('rounded-xl border border-(--border) p-6')}>{children}</div>
        </section>
    );
}

function OptionA(): ReactElement {
    return (
        <div className={cn('space-y-6')}>
            <div className={cn('space-y-4')}>
                <div className={cn('space-y-1')}>
                    <p className={cn('text-subtle text-xs font-semibold tracking-[0.35em] uppercase')}>Package</p>
                    <h1 className={cn('text-2xl font-semibold text-(--text)')}>
                        seedcord <span className={cn('font-normal text-(--text-muted)')}>· v0.11.0</span>
                    </h1>
                </div>
                <div className={cn('flex justify-center lg:justify-start')}>
                    <Tabs />
                </div>
                <hr className={cn('border-(--border)')} />
            </div>
            <ContentStandin />
        </div>
    );
}

function OptionB({ name, version }: { name: string; version: string }): ReactElement {
    return (
        <div className={cn('space-y-6')}>
            <div className={cn('space-y-4')}>
                <div className={cn('flex flex-wrap items-center justify-between gap-4')}>
                    <h1 className={cn('min-w-0 text-2xl font-semibold wrap-break-word text-(--text)')}>
                        {name} <span className={cn('font-normal text-(--text-muted)')}>{version}</span>
                    </h1>
                    <Tabs />
                </div>
                <hr className={cn('border-(--border)')} />
            </div>
            <ContentStandin />
        </div>
    );
}

function OptionC(): ReactElement {
    return (
        <div className={cn('space-y-6')}>
            <div className={cn('space-y-4')}>
                <div className={cn('flex flex-wrap items-center gap-3')}>
                    <h1 className={cn('text-2xl font-semibold text-(--text)')}>seedcord</h1>
                    <span
                        className={cn(
                            'rounded-md border border-(--border) bg-(--surface-subtle) px-2 py-0.5 text-xs font-medium text-(--text-muted)'
                        )}
                    >
                        v0.11.0
                    </span>
                    <span
                        className={cn(
                            'rounded-md bg-(--surface-accent-b-moderate) px-2 py-0.5 text-xs font-medium text-(--text-accent-b-faint)'
                        )}
                    >
                        latest
                    </span>
                </div>
                <div className={cn('flex justify-center lg:justify-start')}>
                    <Tabs />
                </div>
            </div>
            <ContentStandin />
        </div>
    );
}

function OptionD(): ReactElement {
    return (
        <div className={cn('space-y-6')}>
            <div className={cn('flex flex-col gap-3')}>
                <p className={cn('text-sm text-(--text-muted)')}>
                    <span className={cn('font-semibold text-(--text)')}>seedcord</span> · v0.11.0
                </p>
                <div className={cn('flex justify-center lg:justify-start')}>
                    <Tabs />
                </div>
            </div>
            <ContentStandin />
        </div>
    );
}

function OverviewHeaderPage(): ReactElement {
    return (
        <div className={cn('space-y-10 pb-32')}>
            <header className={cn('space-y-2')}>
                <h1 className={cn('text-2xl font-semibold tracking-tight text-(--text)')}>Overview header layouts</h1>
                <p className={cn('text-subtle text-sm')}>
                    Candidate layouts for the top of the package page (title + version + the Overview/Reference toggle).
                    Pick one and I&apos;ll build it for real (with the Badge primitive) and match the loading skeleton
                    to it.
                </p>
            </header>
            <Option title="A - Eyebrow + title, tabs below, divider" note="Classic docs header; clear hierarchy.">
                <OptionA />
            </Option>
            <Option
                title="B - Split row (title left, tabs right)"
                note="Chosen. Tabs wrap below when the name is long or the viewport narrows; the title wraps, never truncates."
            >
                <div className={cn('space-y-10')}>
                    <OptionB name="seedcord" version="v0.11.0" />
                    <OptionB name="eslint-config" version="v1.4.0" />
                    <OptionB name="a-very-long-example-package-name" version="v0.2.3" />
                </div>
            </Option>
            <Option title="C - Title + version pill + latest badge" note="Scannable; surfaces the channel.">
                <OptionC />
            </Option>
            <Option title="D - Compact line, tabs primary" note="Minimal; the toggle leads.">
                <OptionD />
            </Option>
        </div>
    );
}

export default OverviewHeaderPage;
