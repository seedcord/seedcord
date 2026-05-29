'use client';

import { tw, SegmentedControl, Icon, type SegmentedControlOption } from '@seedcord/ui';
import { Code, Eye, Lock } from 'lucide-react';
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

const ACCESS_OPTIONS: SegmentedControlOption<'public' | 'protected' | 'private'>[] = [
    { value: 'public', label: 'Public' },
    { value: 'protected', label: 'Protected' },
    { value: 'private', label: 'Private' }
];

const TAB_OPTIONS: SegmentedControlOption<'pnpm' | 'npm' | 'yarn'>[] = [
    { value: 'pnpm', label: 'pnpm' },
    { value: 'npm', label: 'npm' },
    { value: 'yarn', label: 'yarn' }
];

const ICON_OPTIONS: SegmentedControlOption<'view' | 'code' | 'lock'>[] = [
    { value: 'view', label: 'View', leadingIcon: <Icon icon={Eye} size={14} /> },
    { value: 'code', label: 'Code', leadingIcon: <Icon icon={Code} size={14} /> },
    { value: 'lock', label: 'Locked', leadingIcon: <Icon icon={Lock} size={14} /> }
];

function MemberAccessMock(): ReactElement {
    const [level, setLevel] = useState<'public' | 'protected' | 'private'>('protected');
    return (
        <div className={tw`space-y-2`}>
            <p className={tw`text-subtle text-xs`}>
                Real-world: `MemberAccessControls` 3-option public/protected/private radiogroup.
            </p>
            <SegmentedControl options={ACCESS_OPTIONS} value={level} onChange={setLevel} size="sm" />
        </div>
    );
}

function InstallCommandTabsMock(): ReactElement {
    const [pkg, setPkg] = useState<'pnpm' | 'npm' | 'yarn'>('pnpm');
    return (
        <div className={tw`space-y-2`}>
            <p className={tw`text-subtle text-xs`}>Real-world: `InstallCommandTabs` package-manager picker.</p>
            <SegmentedControl options={TAB_OPTIONS} value={pkg} onChange={setPkg} size="sm" />
        </div>
    );
}

function SizesRow(): ReactElement {
    const [sm, setSm] = useState<'public' | 'protected' | 'private'>('public');
    const [md, setMd] = useState<'public' | 'protected' | 'private'>('public');
    return (
        <div className={tw`flex flex-col gap-3`}>
            <div className={tw`space-y-1`}>
                <p className={tw`text-subtle text-xs tracking-wide`}>size=&quot;sm&quot;</p>
                <SegmentedControl options={ACCESS_OPTIONS} value={sm} onChange={setSm} size="sm" />
            </div>
            <div className={tw`space-y-1`}>
                <p className={tw`text-subtle text-xs tracking-wide`}>size=&quot;md&quot; (default)</p>
                <SegmentedControl options={ACCESS_OPTIONS} value={md} onChange={setMd} size="md" />
            </div>
        </div>
    );
}

function WithIconsRow(): ReactElement {
    const [mode, setMode] = useState<'view' | 'code' | 'lock'>('view');
    return <SegmentedControl options={ICON_OPTIONS} value={mode} onChange={setMode} size="md" />;
}

function MultiInstanceRow(): ReactElement {
    const [a, setA] = useState<'public' | 'protected' | 'private'>('public');
    const [b, setB] = useState<'pnpm' | 'npm' | 'yarn'>('pnpm');
    return (
        <div className={tw`space-y-2`}>
            <p className={tw`text-subtle text-xs`}>
                Two SegmentedControls side by side — each `useId()`-scoped, so the gliding pill animations don&apos;t
                cross-contaminate.
            </p>
            <div className={tw`flex flex-wrap items-center gap-4`}>
                <SegmentedControl options={ACCESS_OPTIONS} value={a} onChange={setA} size="sm" />
                <SegmentedControl options={TAB_OPTIONS} value={b} onChange={setB} size="sm" />
            </div>
        </div>
    );
}

function SegmentedControlPage(): ReactElement {
    return (
        <div className={tw`space-y-10 pb-32`}>
            <header className={tw`space-y-2`}>
                <h1 className={tw`text-2xl font-semibold tracking-tight text-(--text)`}>SegmentedControl</h1>
                <p className={tw`text-subtle text-sm`}>
                    Joined-segment radiogroup with a `motion/react` `layoutId`-driven gliding pill. Each instance is
                    `useId()`-scoped so multi-instance pages don&apos;t cross-contaminate animations. Generic over the
                    value type so consumers preserve their own enum unions.
                </p>
            </header>
            <DevSection title="MemberAccessControls mock (3-option radiogroup)">
                <MemberAccessMock />
            </DevSection>
            <DevSection title="InstallCommandTabs mock (package-manager picker)">
                <InstallCommandTabsMock />
            </DevSection>
            <DevSection title="Sizes (sm + md)">
                <SizesRow />
            </DevSection>
            <DevSection title="With leading icons">
                <WithIconsRow />
            </DevSection>
            <DevSection title="Multi-instance (layoutId scoping)">
                <MultiInstanceRow />
            </DevSection>
        </div>
    );
}

export default SegmentedControlPage;
