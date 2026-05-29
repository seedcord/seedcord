'use client';

import { tw, Button, Popover, PopoverContent, PopoverTrigger } from '@seedcord/ui';
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

const SIDES = ['top', 'right', 'bottom', 'left'] as const;
const ALIGNS = ['start', 'center', 'end'] as const;

function SideMatrix(): ReactElement {
    return (
        <div className={tw`grid grid-cols-2 gap-8 md:grid-cols-4`}>
            {SIDES.map((side) => (
                <div key={side} className={tw`flex flex-col items-center gap-2`}>
                    <div className={tw`text-subtle text-xs tracking-wide`}>side=&quot;{side}&quot;</div>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm">
                                {side}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent side={side} className={tw`w-48`}>
                            <p className={tw`text-sm`}>Side: {side}</p>
                        </PopoverContent>
                    </Popover>
                </div>
            ))}
        </div>
    );
}

function AlignMatrix(): ReactElement {
    return (
        <div className={tw`flex flex-wrap items-start gap-8`}>
            {ALIGNS.map((align) => (
                <div key={align} className={tw`flex flex-col items-start gap-2`}>
                    <div className={tw`text-subtle text-xs tracking-wide`}>align=&quot;{align}&quot;</div>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm">
                                Open ({align})
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align={align} className={tw`w-56`}>
                            <p className={tw`text-sm`}>Align: {align}</p>
                        </PopoverContent>
                    </Popover>
                </div>
            ))}
        </div>
    );
}

function RichContentRow(): ReactElement {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="primary">Open settings</Button>
            </PopoverTrigger>
            <PopoverContent align="start" className={tw`w-72 space-y-3`}>
                <div className={tw`space-y-1`}>
                    <p className={tw`text-sm font-semibold text-(--text)`}>Notification preferences</p>
                    <p className={tw`text-subtle text-xs`}>Manage which events trigger a toast.</p>
                </div>
                <div className={tw`flex justify-end gap-2`}>
                    <Button variant="ghost" size="sm">
                        Cancel
                    </Button>
                    <Button variant="primary" size="sm">
                        Save
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}

function ControlledRow(): ReactElement {
    const [open, setOpen] = useState(false);
    return (
        <div className={tw`flex flex-wrap items-center gap-3`}>
            <Button variant="outline" size="sm" onClick={() => setOpen((prev) => !prev)}>
                Toggle externally
            </Button>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button variant="primary" size="sm">
                        Controlled trigger
                    </Button>
                </PopoverTrigger>
                <PopoverContent className={tw`w-56`}>
                    <p className={tw`text-sm`}>open={String(open)}</p>
                </PopoverContent>
            </Popover>
        </div>
    );
}

function PopoverPage(): ReactElement {
    return (
        <div className={tw`space-y-10 pb-32`}>
            <header className={tw`space-y-2`}>
                <h1 className={tw`text-2xl font-semibold tracking-tight text-(--text)`}>Popover</h1>
                <p className={tw`text-subtle text-sm`}>
                    Wraps `@radix-ui/react-popover`. Compound API: Popover (Root) + PopoverTrigger + PopoverContent +
                    PopoverArrow + PopoverAnchor + PopoverClose. Content surface bakes in rounded-lg + border +
                    shadow-card + bg-(--bg-popover) so consumers don&apos;t need an inner Card wrap. Scale animation
                    anchors on the trigger via `--radix-popover-content-transform-origin`.
                </p>
            </header>
            <DevSection title="Side matrix">
                <SideMatrix />
            </DevSection>
            <DevSection title="Align matrix (side=bottom)">
                <AlignMatrix />
            </DevSection>
            <DevSection title="Rich content (heading + actions)">
                <RichContentRow />
            </DevSection>
            <DevSection title="Controlled state (external open/close)">
                <ControlledRow />
            </DevSection>
        </div>
    );
}

export default PopoverPage;
