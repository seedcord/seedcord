'use client';

import { SegmentedControl } from '@seedcord/ui';

import type { SegmentedControlOption } from '@seedcord/ui';
import type { ReactElement } from 'react';

export type Transport = 'gateway' | 'http';

const TRANSPORT_OPTIONS: readonly SegmentedControlOption<Transport>[] = [
    { value: 'gateway', label: 'gateway' },
    { value: 'http', label: 'http' }
];

export interface TransportControlProps {
    value: Transport;
    onChange: (next: Transport) => void;
}

export function TransportControl({ value, onChange }: TransportControlProps): ReactElement {
    return (
        <SegmentedControl
            options={TRANSPORT_OPTIONS}
            value={value}
            onChange={onChange}
            size="md"
            aria-label="Transport shown in code samples"
        />
    );
}
