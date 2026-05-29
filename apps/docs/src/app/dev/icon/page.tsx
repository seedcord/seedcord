'use client';

import { GithubIcon, Icon, cn } from '@seedcord/ui';
import { Check, Code, Command, Search, Settings, Sun } from 'lucide-react';

import type { ReactElement } from 'react';

// eslint-disable-next-line no-magic-numbers -- pixel size matrix
const SIZES = [12, 14, 16, 18, 20, 24, 32] as const;
const LUCIDE_SAMPLE = [
    { Cmp: Settings, label: 'Settings' },
    { Cmp: Search, label: 'Search' },
    { Cmp: Sun, label: 'Sun' },
    { Cmp: Check, label: 'Check' },
    { Cmp: Code, label: 'Code' },
    { Cmp: Command, label: 'Command' }
] as const;

function Section({ title, children }: { title: string; children: ReactElement | ReactElement[] }): ReactElement {
    return (
        <section className={cn('space-y-3')}>
            <h2 className={cn('text-subtle text-xs font-semibold tracking-widest uppercase')}>{title}</h2>
            {children}
        </section>
    );
}

function SizeMatrix(): ReactElement {
    return (
        <div className={cn('flex flex-wrap items-end gap-6')}>
            {SIZES.map((size) => (
                <div key={size} className={cn('flex flex-col items-center gap-2')}>
                    <Icon icon={Settings} size={size} />
                    <span className={cn('text-subtle text-xs')}>{size}px</span>
                </div>
            ))}
        </div>
    );
}

function LucideGallery(): ReactElement {
    return (
        <div className={cn('flex flex-wrap gap-6')}>
            {LUCIDE_SAMPLE.map(({ Cmp, label }) => (
                <div key={label} className={cn('flex flex-col items-center gap-2')}>
                    <Icon icon={Cmp} size={20} />
                    <span className={cn('text-subtle text-xs')}>{label}</span>
                </div>
            ))}
        </div>
    );
}

function GithubVariants(): ReactElement {
    return (
        <div className={cn('flex flex-wrap items-end gap-6')}>
            {/* eslint-disable-next-line no-magic-numbers -- pixel size matrix */}
            {[16, 20, 24, 32].map((size) => (
                <div key={size} className={cn('flex flex-col items-center gap-2')}>
                    <Icon icon={GithubIcon} size={size} />
                    <span className={cn('text-subtle text-xs')}>{size}px (via Icon wrap)</span>
                </div>
            ))}
            <div className={cn('flex flex-col items-center gap-2')}>
                <GithubIcon size={24} className={cn('text-(--accent-a)')} />
                <span className={cn('text-subtle text-xs')}>direct, accent-a</span>
            </div>
        </div>
    );
}

function TitleVariants(): ReactElement {
    return (
        <div className={cn('flex flex-wrap items-center gap-6')}>
            <Icon icon={Settings} size={20} title="Settings (accessible name)" />
            <span className={cn('text-subtle text-xs')}>
                ↑ wraps in <code>&lt;span role=&quot;img&quot;&gt;</code> with aria-label
            </span>
        </div>
    );
}

function IconPage(): ReactElement {
    return (
        <div className={cn('space-y-10')}>
            <header className={cn('space-y-2')}>
                <h1 className={cn('text-2xl font-semibold tracking-tight text-(--text)')}>Icon + GithubIcon</h1>
                <p className={cn('text-subtle text-sm')}>
                    Icon accepts <code>LucideIcon | typeof GithubIcon</code> via `icon` prop. Pure presentational
                    (server component-compatible). All icons inherit `text-current` from parent. GithubIcon also
                    standalone with full SVG attribute typing.
                </p>
            </header>
            <Section title="Size matrix (default Lucide stroke = 2)">
                <SizeMatrix />
            </Section>
            <Section title="Lucide gallery (text-current inherits theme)">
                <LucideGallery />
            </Section>
            <Section title="GithubIcon (custom SVG, strokeWidth={12})">
                <GithubVariants />
            </Section>
            <Section title="Title prop (accessibility wrapper)">
                <TitleVariants />
            </Section>
        </div>
    );
}

export default IconPage;
