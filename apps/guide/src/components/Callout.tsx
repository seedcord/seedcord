import { Card, Icon, cn } from '@seedcord/ui';
import { ArrowLeftRight, Info, Lightbulb, OctagonAlert, TriangleAlert } from 'lucide-react';

import { CALLOUT_LABELS, TRANSPORT_LABELS } from '#lib/callout';

import type { CalloutType, Transport } from '#lib/callout';
import type { IconComponent } from '@seedcord/ui';
import type { ReactElement, ReactNode } from 'react';

const ICONS = {
    note: Info,
    tip: Lightbulb,
    warning: TriangleAlert,
    danger: OctagonAlert,
    transport: ArrowLeftRight
} as const satisfies Record<CalloutType, IconComponent>;

export interface CalloutProps {
    type: CalloutType;
    /** Which transport the difference applies to. Leave it off to say both differ. */
    only?: Transport;
    children: ReactNode;
}

export function Callout({ type, only, children }: CalloutProps): ReactElement {
    const icon = ICONS[type];
    if (icon === undefined) {
        throw new Error(`${type} is not a callout. Write one of ${Object.keys(CALLOUT_LABELS).join(', ')}.`);
    }

    if (only !== undefined && type !== 'transport') {
        throw new Error(`only is for a transport callout. This one is a ${type}.`);
    }

    const label = only === undefined ? CALLOUT_LABELS[type] : TRANSPORT_LABELS[only];
    if (label === undefined) {
        throw new Error(`${only} is not a transport. Write one of ${Object.keys(TRANSPORT_LABELS).join(', ')}.`);
    }

    return (
        <Card as="div" size="none" data-callout={type} className={cn('border-(--cal-border) bg-(--cal-bg) px-4 py-3')}>
            <p className={cn('flex items-center gap-2 text-(--cal-text)')}>
                <Icon icon={icon} size={15} />
                <span className={cn('text-[0.625rem] font-semibold tracking-widest uppercase')}>{label}</span>
            </p>
            {/* a one-line callout arrives as bare text with no p around it */}
            <div className={cn('mt-1.5 space-y-3 text-sm/relaxed text-(--text) [&>p]:text-sm/relaxed')}>{children}</div>
        </Card>
    );
}
