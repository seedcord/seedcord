'use client';

import { Button, type ButtonSize, type ButtonVariant, cn } from '@seedcord/ui';
import { ArrowRight, Settings } from 'lucide-react';
import Link from 'next/link';

import type { ReactElement } from 'react';

const VARIANTS = ['primary', 'secondary', 'outline', 'ghost'] as const satisfies readonly ButtonVariant[];
const SIZES = ['sm', 'md', 'lg', 'icon'] as const satisfies readonly ButtonSize[];

function Section({ title, children }: { title: string; children: ReactElement | ReactElement[] }): ReactElement {
    return (
        <section className={cn('space-y-3')}>
            <h2 className={cn('text-subtle text-xs font-semibold tracking-widest uppercase')}>{title}</h2>
            {children}
        </section>
    );
}

function VariantMatrix(): ReactElement {
    return (
        <div className={cn('space-y-4')}>
            {VARIANTS.map((variant) => (
                <div key={variant} className={cn('space-y-2')}>
                    <div className={cn('text-subtle text-xs font-medium tracking-wide')}>{variant}</div>
                    <div className={cn('flex flex-wrap items-center gap-3')}>
                        {SIZES.map((size) => (
                            <Button key={size} variant={variant} size={size}>
                                {size === 'icon' ? <Settings size={18} /> : `${variant} · ${size}`}
                            </Button>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function StatesRow(): ReactElement {
    return (
        <div className={cn('flex flex-wrap items-center gap-3')}>
            <Button>Default</Button>
            <Button disabled>Disabled (no hover)</Button>
            <Button variant="outline" disabled>
                Outline disabled
            </Button>
            <Button variant="ghost" disabled>
                Ghost disabled
            </Button>
        </div>
    );
}

function IconTextRow(): ReactElement {
    return (
        <div className={cn('flex flex-wrap items-center gap-3')}>
            <Button variant="primary">
                <Settings size={16} /> Settings
            </Button>
            <Button variant="secondary">
                Continue <ArrowRight size={16} />
            </Button>
            <Button variant="outline">
                <Settings size={16} /> Outline
            </Button>
            <Button variant="ghost">
                <Settings size={16} /> Ghost
            </Button>
        </div>
    );
}

function AsChildRow(): ReactElement {
    return (
        <div className={cn('flex flex-wrap items-center gap-3')}>
            <Button asChild variant="primary">
                <Link href="/dev">
                    Back to /dev <ArrowRight size={16} />
                </Link>
            </Button>
            <Button asChild variant="ghost" size="icon" aria-label="Settings link">
                <Link href="/dev">
                    <Settings size={18} />
                </Link>
            </Button>
        </div>
    );
}

function TouchTargetRow(): ReactElement {
    return (
        <>
            <p className={cn('text-subtle text-xs')}>
                Icon size = 40px (`size-10`). Below the 44px guideline. Flag if user-facing affordances on mobile need a
                size=&quot;lg&quot; or a touch-target pad.
            </p>
            <div className={cn('flex flex-wrap items-center gap-3')}>
                <div className={cn('rounded-md border border-dashed border-(--border) p-2')}>
                    <Button variant="ghost" size="icon" aria-label="40px icon button">
                        <Settings size={18} />
                    </Button>
                </div>
                <div className={cn('rounded-md border border-dashed border-(--border) p-2')}>
                    <Button variant="ghost" size="lg" aria-label="48px button">
                        <Settings size={18} /> Lg (48px height)
                    </Button>
                </div>
            </div>
        </>
    );
}

function ButtonPage(): ReactElement {
    return (
        <div className={cn('space-y-10')}>
            <header className={cn('space-y-2')}>
                <h1 className={cn('text-2xl font-semibold tracking-tight text-(--text)')}>Button</h1>
                <p className={cn('text-subtle text-sm')}>
                    React 19 ref-as-prop, asChild via Radix Slot, four variants × four sizes. Tokens consumed from
                    `@seedcord/ui/lib/tokens`. Press feedback (active:scale 0.97) baked into the base class.
                </p>
            </header>
            <Section title="Variant × size matrix">
                <VariantMatrix />
            </Section>
            <Section title="States">
                <StatesRow />
            </Section>
            <Section title="Icon + text (compose children, any variant)">
                <IconTextRow />
            </Section>
            <Section title="asChild (composes Radix Slot, wraps a Link)">
                <AsChildRow />
            </Section>
            <Section title="Responsive touch-target check (≥44px on mobile)">
                <TouchTargetRow />
            </Section>
        </div>
    );
}

export default ButtonPage;
