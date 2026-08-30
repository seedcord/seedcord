export const CALLOUT_LABELS = {
    note: 'Note',
    tip: 'Tip',
    warning: 'Warning',
    danger: 'Danger',
    transport: 'Gateway and http differ'
} as const;

export const TRANSPORT_LABELS = { gateway: 'Gateway only', http: 'Http only' } as const;

export type CalloutType = keyof typeof CALLOUT_LABELS;
export type Transport = keyof typeof TRANSPORT_LABELS;
