import chalk from 'chalk';

import type { ColorSupportLevel } from 'chalk';

// @seedcord/ui carries the same three for the web
export const BRAND = {
    flesh: '#f04e36',
    rind: '#6fab49',
    pith: '#f8f6e8'
} as const;

// the edge build of this package can't import node:path
function relativeToCwd(rawPath: string): string {
    if (typeof process === 'undefined' || typeof process.cwd !== 'function') return rawPath;

    const path = rawPath.length > 1 ? rawPath.replace(/[/\\]+$/, '') : rawPath;
    const cwd = process.cwd();
    // a bare dot reads as a full stop
    if (path === cwd) return './';

    const underCwd = path.startsWith(`${cwd}/`) || path.startsWith(`${cwd}\\`);
    return underCwd ? path.slice(cwd.length + 1) : path;
}

// chalk turns color on only for a chromium user agent outside node
export function setColorLevel(level: ColorSupportLevel): void {
    chalk.level = level;
}

const SKY = '#8fc7ff';

// truecolor because a terminal theme remaps chalk's 16-color names (blue turns orange in monokai)
// chalk.hex bakes in the level it ran at. a getter picks up a level set later, like the edge worker's
export const paint = {
    // what the line is about, one per line
    get sky() {
        return chalk.hex(SKY);
    },
    path: (path: string) => chalk.hex(SKY)(relativeToCwd(path)),
    // a count
    get iris() {
        return chalk.hex('#e29bff');
    },
    // success
    get mint() {
        return chalk.hex('#66d98a');
    },
    // go do something about this
    get amber() {
        return chalk.hex('#ffc061');
    },
    // failure
    get coral() {
        return chalk.hex('#ff6b85');
    },
    // brand marks
    get flesh() {
        return chalk.hex(BRAND.flesh);
    },
    get rind() {
        return chalk.hex(BRAND.rind);
    },
    get pith() {
        return chalk.hex(BRAND.pith);
    },
    mute: chalk.dim, // context around the subject

    check: '✔︎', // U+FE0E to prevent emoji font
    cross: '✘',

    // weight and shape
    bold: chalk.bold,
    italic: chalk.italic,
    underline: chalk.underline
} as const;

export const WORDMARK = `${paint.flesh.bold('seed')}${paint.rind.bold('cord')}`;
