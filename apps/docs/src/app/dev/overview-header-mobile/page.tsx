'use client';

import { SegmentedControl, cn, type SegmentedControlOption } from '@seedcord/ui';
import { useState } from 'react';

import type { ReactElement, ReactNode } from 'react';

const TAB_OPTIONS: SegmentedControlOption<'overview' | 'reference'>[] = [
    { value: 'overview', label: 'Overview' },
    { value: 'reference', label: 'Reference' }
];

function Tabs({ fullWidth = false }: { fullWidth?: boolean }): ReactElement {
    const [tab, setTab] = useState<'overview' | 'reference'>('overview');
    return (
        <SegmentedControl
            options={TAB_OPTIONS}
            value={tab}
            onChange={setTab}
            size="md"
            fullWidth={fullWidth}
            aria-label="Package view"
        />
    );
}

function Eyebrow(): ReactElement {
    return <p className={cn('text-subtle text-xs font-semibold tracking-[0.35em] uppercase')}>Package</p>;
}

function Title(): ReactElement {
    return (
        <h1 className={cn('text-2xl font-semibold wrap-break-word text-(--text)')}>
            seedcord <span className={cn('font-normal text-(--text-muted)')}>v0.11.0</span>
        </h1>
    );
}

function ContentStandin(): ReactElement {
    return (
        <div className={cn('space-y-3 opacity-70')}>
            <div className={cn('mx-auto h-24 w-full max-w-xs rounded-md bg-(--surface-subtle)')} />
            <div className={cn('h-4 w-3/4 rounded bg-(--surface-subtle)')} />
            <div className={cn('h-4 w-2/3 rounded bg-(--surface-subtle)')} />
        </div>
    );
}

function MobileFrame({ children }: { children: ReactNode }): ReactElement {
    return <div className={cn('mx-auto w-95 rounded-xl border border-(--border) p-4')}>{children}</div>;
}

function Option({ title, children }: { title: string; children: ReactNode }): ReactElement {
    return (
        <section className={cn('space-y-3')}>
            <h2 className={cn('text-subtle text-xs font-semibold tracking-widest uppercase')}>{title}</h2>
            {children}
        </section>
    );
}

function MobileCentered(): ReactElement {
    return (
        <div className={cn('space-y-5')}>
            <div className={cn('space-y-1 text-center')}>
                <Eyebrow />
                <Title />
            </div>
            <div className={cn('flex justify-center')}>
                <Tabs />
            </div>
            <hr className={cn('border-(--border)')} />
            <ContentStandin />
        </div>
    );
}

function MobileFullWidth(): ReactElement {
    return (
        <div className={cn('space-y-5')}>
            <div className={cn('space-y-1 text-center')}>
                <Eyebrow />
                <Title />
            </div>
            <Tabs fullWidth />
            <hr className={cn('border-(--border)')} />
            <ContentStandin />
        </div>
    );
}

function MobileLeft(): ReactElement {
    return (
        <div className={cn('space-y-5')}>
            <div className={cn('space-y-1')}>
                <Eyebrow />
                <Title />
            </div>
            <Tabs />
            <hr className={cn('border-(--border)')} />
            <ContentStandin />
        </div>
    );
}

function OverviewHeaderMobilePage(): ReactElement {
    return (
        <div className={cn('space-y-10 pb-32')}>
            <header className={cn('space-y-2')}>
                <h1 className={cn('text-2xl font-semibold tracking-tight text-(--text)')}>Overview header (mobile)</h1>
                <p className={cn('text-subtle text-sm')}>
                    Mobile layouts for the package header, each in a 380px frame. Pick one; desktop stays as B (split
                    row).
                </p>
            </header>
            <Option title="M1 - Centered stack">
                <MobileFrame>
                    <MobileCentered />
                </MobileFrame>
            </Option>
            <Option title="M2 - Full-width tabs">
                <MobileFrame>
                    <MobileFullWidth />
                </MobileFrame>
            </Option>
            <Option title="M3 - Left-aligned stack">
                <MobileFrame>
                    <MobileLeft />
                </MobileFrame>
            </Option>
        </div>
    );
}

export default OverviewHeaderMobilePage;
