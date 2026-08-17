import chalk from 'chalk';

// @seedcord/ui carries the same three for the web
export const BRAND = {
    flesh: '#f04e36',
    rind: '#6fab49',
    pith: '#f8f6e8'
} as const;

// truecolor because a terminal theme remaps chalk's 16-color names (blue turns orange in monokai)
export const paint = {
    sky: chalk.hex('#8fc7ff'), // what the line is about, one per line
    iris: chalk.hex('#e29bff'), // a count
    mint: chalk.hex('#66d98a'), // success
    amber: chalk.hex('#ffc061'), // go do something about this
    coral: chalk.hex('#ff6b85'), // failure
    // brand marks
    flesh: chalk.hex(BRAND.flesh),
    rind: chalk.hex(BRAND.rind),
    pith: chalk.hex(BRAND.pith),
    mute: chalk.dim, // context around the subject
    // weight and shape
    bold: chalk.bold,
    italic: chalk.italic,
    underline: chalk.underline
} as const;
