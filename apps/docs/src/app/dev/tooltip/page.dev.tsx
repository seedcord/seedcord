'use client';

import { tw, Button, Tooltip, TooltipContent, TooltipRoot, TooltipTrigger, GithubIcon, cn } from '@seedcord/ui';
import { Info, Settings } from 'lucide-react';

import type { ReactElement, ReactNode } from 'react';

function DevSection({ title, children }: { title: string; children: ReactNode }): ReactElement {
    return (
        <section className={cn('space-y-3')}>
            <h2 className={cn('text-subtle text-xs font-semibold tracking-widest uppercase')}>{title}</h2>
            {children}
        </section>
    );
}

function WrapperShape(): ReactElement {
    return (
        <div className={cn('flex flex-wrap items-center gap-4')}>
            <Tooltip content="View source on GitHub" side="top">
                <Button variant="ghost" size="icon" aria-label="GitHub">
                    <GithubIcon className={cn('size-5')} />
                </Button>
            </Tooltip>
            <Tooltip content="Settings" side="top">
                <Button variant="ghost" size="icon" aria-label="Settings">
                    <Settings className={cn('size-5')} />
                </Button>
            </Tooltip>
            <Tooltip content="Useful info" side="top">
                <Button variant="outline" size="sm">
                    Hover me
                </Button>
            </Tooltip>
        </div>
    );
}

function CompoundShape(): ReactElement {
    return (
        <div className={cn('flex flex-wrap items-center gap-4')}>
            <TooltipRoot>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Info">
                        <Info className={cn('size-5')} />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                    <span className={cn('font-medium')}>Press</span>{' '}
                    <kbd
                        className={cn('rounded-sm border border-(--border) bg-(--surface-subtle) px-1 text-[0.65rem]')}
                    >
                        ⌘K
                    </kbd>{' '}
                    to search
                </TooltipContent>
            </TooltipRoot>
            <TooltipRoot>
                <TooltipTrigger asChild>
                    <Button variant="outline" size="sm">
                        Multi-line trigger
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="start" className={cn('max-w-56')}>
                    Compound shape lets the consumer compose richer content blocks, custom sides per-instance, and
                    bespoke max-widths without prop sprawl on the wrapper.
                </TooltipContent>
            </TooltipRoot>
        </div>
    );
}

const SIDES = ['top', 'right', 'bottom', 'left'] as const;

function SideMatrix(): ReactElement {
    return (
        <div className={cn('grid grid-cols-2 gap-8 md:grid-cols-4')}>
            {SIDES.map((side) => (
                <div key={side} className={cn('flex flex-col items-center gap-2')}>
                    <div className={cn('text-subtle text-xs tracking-wide')}>side=&quot;{side}&quot;</div>
                    <Tooltip content={`side=${side}`} side={side}>
                        <Button variant="outline" size="sm">
                            {side}
                        </Button>
                    </Tooltip>
                </div>
            ))}
        </div>
    );
}

function AnimationTrials(): ReactElement {
    return (
        <div className={cn('space-y-3')}>
            <p className={cn('text-subtle text-xs')}>
                Hover each trigger and compare entrance feel. Move the mouse from one trigger to the next within ~300ms
                to see the instant-open behavior (no animation on subsequent tooltips).
            </p>
            <div className={cn('grid gap-4 md:grid-cols-3')}>
                <div className={cn('flex flex-col items-start gap-2')}>
                    <div className={cn('text-subtle text-xs tracking-wide')}>
                        A · default (scale 0.95 + fade, 150ms ease-out-strong)
                    </div>
                    <Tooltip content="Animation: default" side="top">
                        <Button variant="outline" size="sm">
                            Hover default
                        </Button>
                    </Tooltip>
                </div>
                <div className={cn('flex flex-col items-start gap-2')}>
                    <div className={cn('text-subtle text-xs tracking-wide')}>
                        B · opacity-only (no scale, 120ms ease)
                    </div>
                    <Tooltip
                        content="Animation: opacity"
                        side="top"
                        contentClassName={tw`transition-opacity! duration-120! ease-out! data-[state=closed]:animate-none! data-[state=closed]:opacity-0! data-[state=delayed-open]:animate-none! data-[state=delayed-open]:opacity-100!`}
                    >
                        <Button variant="outline" size="sm">
                            Hover opacity
                        </Button>
                    </Tooltip>
                </div>
                <div className={cn('flex flex-col items-start gap-2')}>
                    <div className={cn('text-subtle text-xs tracking-wide')}>
                        C · stronger pop (scale 0.9 + fade, 180ms)
                    </div>
                    <Tooltip
                        content="Animation: pop"
                        side="top"
                        contentClassName={tw`data-[state=closed]:zoom-out-90 data-[state=delayed-open]:duration-180 data-[state=delayed-open]:zoom-in-90`}
                    >
                        <Button variant="outline" size="sm">
                            Hover pop
                        </Button>
                    </Tooltip>
                </div>
            </div>
        </div>
    );
}

function LongTextRow(): ReactElement {
    return (
        <Tooltip
            content="Tooltips wrap at max-w-xs (~20rem) so long-form labels keep readable line lengths instead of stretching across the viewport. This sentence is intentionally long enough to wrap two lines."
            side="top"
        >
            <Button variant="outline" size="sm">
                Hover for long text
            </Button>
        </Tooltip>
    );
}

function DisabledTriggerRow(): ReactElement {
    return (
        <div className={cn('flex flex-wrap items-center gap-4')}>
            <Tooltip content="Disabled buttons swallow pointer events; tooltip silently fails" side="top">
                <Button variant="outline" size="sm" disabled>
                    Broken (raw disabled)
                </Button>
            </Tooltip>
            <Tooltip content="Wrap the disabled button in a span so pointer events still bubble" side="top">
                <span className={cn('inline-block cursor-not-allowed')}>
                    <Button variant="outline" size="sm" disabled className={cn('pointer-events-none')}>
                        Works (span wrapper)
                    </Button>
                </span>
            </Tooltip>
        </div>
    );
}

function InstantOpenRow(): ReactElement {
    return (
        <div className={cn('space-y-2')}>
            <p className={cn('text-subtle text-xs')}>
                Hover the first trigger, wait for tooltip, move to the next within 300ms. Subsequent tooltips open
                instantly (skipDelayDuration) with no animation (data-state=instant-open).
            </p>
            <div className={cn('flex flex-wrap items-center gap-2')}>
                {['One', 'Two', 'Three', 'Four', 'Five'].map((label) => (
                    <Tooltip key={label} content={`Tooltip ${label}`} side="top">
                        <Button variant="ghost" size="icon" aria-label={label}>
                            <Info className={cn('size-5')} />
                        </Button>
                    </Tooltip>
                ))}
            </div>
        </div>
    );
}

function TooltipPage(): ReactElement {
    return (
        <div className={cn('space-y-10')}>
            <header className={cn('space-y-2')}>
                <h1 className={cn('text-2xl font-semibold tracking-tight text-(--text)')}>Tooltip</h1>
                <p className={cn('text-subtle text-sm')}>
                    Radix `@radix-ui/react-tooltip` wrap. Provider mounted once in the app layout (delay 400ms,
                    skipDelay 300ms, hoverable content disabled). Two consumption shapes: convenience wrapper for the
                    common case, and compound primitives (`TooltipRoot` / `TooltipTrigger` / `TooltipContent`) for
                    custom content.
                </p>
            </header>
            <DevSection title="Shape A · wrapper (recommended common case)">
                <WrapperShape />
            </DevSection>
            <DevSection title="Shape B · compound (custom content / per-instance sides)">
                <CompoundShape />
            </DevSection>
            <DevSection title="Side matrix (top / right / bottom / left)">
                <SideMatrix />
            </DevSection>
            <DevSection title="Animation trials (compare entrance feel)">
                <AnimationTrials />
            </DevSection>
            <DevSection title="Long-form content (max-w-xs wraps to 2 lines)">
                <LongTextRow />
            </DevSection>
            <DevSection title="Disabled trigger (pointer-events workaround)">
                <DisabledTriggerRow />
            </DevSection>
            <DevSection title="skipDelayDuration (instant subsequent tooltips, no animation)">
                <InstantOpenRow />
            </DevSection>
        </div>
    );
}

export default TooltipPage;
