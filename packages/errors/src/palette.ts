import chalk from 'chalk';

// truecolor because a terminal theme remaps chalk's 16-color names (blue turns orange in monokai)
export const paint = {
    sky: chalk.hex('#8fc7ff'),
    iris: chalk.hex('#e29bff'),
    mint: chalk.hex('#66d98a'),
    amber: chalk.hex('#ffc061'),
    coral: chalk.hex('#ff6b85'),
    mute: chalk.dim
} as const;
