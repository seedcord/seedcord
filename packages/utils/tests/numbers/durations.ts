// read by parseDuration's tests and ValidDuration's type tests. A change to one grammar fails the other's test
export const acceptedDurations = ['500ms', '90s', '30m', '24h', '7d', '05s', '120s'] as const;

export const rejectedDurations = [
    '0s',
    '00ms',
    '0h',
    '1.5h',
    '-5m',
    '30',
    'ms',
    '',
    '30M',
    '2w',
    '24hh',
    '24 h',
    ' 24h',
    '24h '
] as const;
