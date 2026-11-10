// the CronPattern type tests and the croner tests both read this table. A test fails once the two give different answers
export const acceptedPatterns = [
    '* * * * *',
    '*/15 * * * *',
    '@daily',
    '@hourly',
    '0 0 9 * * mon-fri',
    '0 0 * jan-mar *',
    '0 0 1,15 * *',
    '0 0 * * 7',
    '0 0 L * *',
    '0 0 LW * *',
    '0 0 15W * *',
    '0 0 * * FRI#L',
    '0 0 * * 5-6#L',
    '0 0 * * 5-6#2',
    '0 0 * * 5-6L',
    // croner trims a pattern and splits it on runs of whitespace
    ' 0  9 *\t* * ',
    ' @weekly ',
    '@WEEKLY'
] as const;

export const rejectedPatterns = [
    '* * * *',
    '  ',
    '61 * * * *',
    '0 0 32 * *',
    '0 0 * 13 *',
    '0 0 * * 8',
    '5-1 * * * *',
    '1,,2 * * * *',
    'a * * * *',
    '0 0 * * 5#6',
    '0 0 * * MON#0',
    '0 0 * * 6-5#L',
    '@fortnightly',
    '@ weekly'
] as const;
