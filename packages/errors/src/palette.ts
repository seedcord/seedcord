import chalk from 'chalk';

// @seedcord/ui carries the same three for the web
export const BRAND = {
    flesh: '#f04e36',
    rind: '#6fab49',
    pith: '#f8f6e8'
} as const;

// truecolor because a terminal theme remaps chalk's 16-color names (blue turns orange in monokai)
export const paint = {
    sky: chalk.hex('#8fc7ff'),
    iris: chalk.hex('#e29bff'),
    mint: chalk.hex('#66d98a'),
    amber: chalk.hex('#ffc061'),
    coral: chalk.hex('#ff6b85'),
    flesh: chalk.hex(BRAND.flesh),
    rind: chalk.hex(BRAND.rind),
    pith: chalk.hex(BRAND.pith),
    mute: chalk.dim
} as const;
