import chalk from 'chalk';

// @seedcord/ui carries the same three for the web
export const BRAND = {
    flesh: '#f04e36',
    rind: '#6fab49',
    pith: '#f8f6e8'
} as const;

// the edge build of this package can't import node:path
function relativeToCwd(path: string): string {
    if (typeof process === 'undefined' || typeof process.cwd !== 'function') return path;

    const cwd = process.cwd();
    // a bare dot reads as a full stop at the end of a message
    if (path === cwd) return './';

    const underCwd = path.startsWith(`${cwd}/`) || path.startsWith(`${cwd}\\`);
    return underCwd ? path.slice(cwd.length + 1) : path;
}

const sky = chalk.hex('#8fc7ff');

// truecolor because a terminal theme remaps chalk's 16-color names (blue turns orange in monokai)
export const paint = {
    sky, // what the line is about, one per line
    path: (path: string) => sky(relativeToCwd(path)),
    iris: chalk.hex('#e29bff'), // a count
    mint: chalk.hex('#66d98a'), // success
    amber: chalk.hex('#ffc061'), // go do something about this
    coral: chalk.hex('#ff6b85'), // failure
    // brand marks
    flesh: chalk.hex(BRAND.flesh),
    rind: chalk.hex(BRAND.rind),
    pith: chalk.hex(BRAND.pith),
    mute: chalk.dim, // context around the subject
    check: '✔︎', // U+FE0E to prevent emoji font
    cross: '✘',
    // weight and shape
    bold: chalk.bold,
    italic: chalk.italic,
    underline: chalk.underline
} as const;

export const WORDMARK = `${paint.flesh.bold('seed')}${paint.rind.bold('cord')}`;
