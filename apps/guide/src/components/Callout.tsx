import { Card, Icon, cn } from '@seedcord/ui';
import { ArrowLeftRight, Info, Lightbulb, OctagonAlert, TriangleAlert } from 'lucide-react';

import type { IconComponent } from '@seedcord/ui';
import type { ReactElement, ReactNode } from 'react';

const KINDS = {
    note: { label: 'Note', icon: Info },
    tip: { label: 'Tip', icon: Lightbulb },
    warning: { label: 'Warning', icon: TriangleAlert },
    danger: { label: 'Danger', icon: OctagonAlert },
    transport: { label: 'Gateway and http differ', icon: ArrowLeftRight }
} as const satisfies Record<string, { label: string; icon: IconComponent }>;

const TRANSPORT_LABELS = { gateway: 'Gateway only', http: 'Http only' } as const;

type CalloutType = keyof typeof KINDS;
type Transport = keyof typeof TRANSPORT_LABELS;

export interface CalloutProps {
    type: CalloutType;
    /** Which transport the difference applies to. Leave it off to say both differ. */
    only?: Transport;
    children: ReactNode;
}

export function Callout({ type, only, children }: CalloutProps): ReactElement {
    const kind = KINDS[type];
    if (kind === undefined) throw new Error(`${type} is not a callout. Write one of ${Object.keys(KINDS).join(', ')}.`);

    const label = only === undefined ? kind.label : TRANSPORT_LABELS[only];

    return (
        <Card as="div" size="none" data-callout={type} className={cn('border-(--cal-border) bg-(--cal-bg) px-4 py-3')}>
            <p className={cn('flex items-center gap-2 text-(--cal-text)')}>
                <Icon icon={kind.icon} size={15} />
                <span className={cn('text-[0.625rem] font-semibold tracking-widest uppercase')}>{label}</span>
            </p>
            {/* a one-line callout arrives as bare text with no p around it */}
            <div className={cn('mt-1.5 space-y-3 text-sm/relaxed text-(--text) [&>p]:text-sm/relaxed')}>{children}</div>
        </Card>
    );
}
