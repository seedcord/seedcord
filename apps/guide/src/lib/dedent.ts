const INDENTS = /^[ \t]*(?=\S)/gm;

export function commonIndent(code: string): number {
    const found = code.match(INDENTS) ?? [];

    return found.reduce((width, indent) => Math.min(width, indent.length), Infinity);
}

export function dedent(code: string): string {
    const width = commonIndent(code);
    if (!Number.isFinite(width) || width === 0) return code;

    return code.replace(new RegExp(`^[ \\t]{${String(width)}}`, 'gm'), '');
}
