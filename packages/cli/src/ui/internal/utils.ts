const ANSI_REGEX = new RegExp(
    [
        '[\\u001B\\u009B][[\\]()#;?]*(?:',
        '(?:[a-zA-Z\\d]*(?:;[a-zA-Z\\d]*)*)?\\u0007',
        '|',
        '(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]',
        ')'
    ].join(''),
    'g'
);

export function stripAnsi(input: string): string {
    return input.replace(ANSI_REGEX, '');
}

export function splitLinesPreserveEmptyTail(input: string): string[] {
    return input.split(/\r?\n/);
}

export function countVisualLines(text: string, columns: number): number {
    if (!text) return 0;

    const MAX_SAFE_COLUMNS = 80;
    const safeColumns = columns > 0 ? columns : MAX_SAFE_COLUMNS;
    const rawLines = splitLinesPreserveEmptyTail(text);

    let total = 0;
    for (const rawLine of rawLines) {
        const visible = stripAnsi(rawLine);
        const len = visible.length;

        if (len === 0) {
            total += 1;
            continue;
        }

        total += Math.max(1, Math.ceil(len / safeColumns));
    }

    return total;
}
