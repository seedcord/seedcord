import chalk from 'chalk';

// the dev CLI paints the wordmark in these two
const SEED = '#f04e36';
const CORD = '#6fab49';
const VERSION = '#f7f5e8';

export function banner(version = process.env.PACKAGE_VERSION): string {
    const wordmark = `${chalk.hex(SEED).bold('seed')}${chalk.hex(CORD).bold('cord')}`;
    if (version === undefined) return wordmark;

    return `${wordmark}${chalk.hex(VERSION)(` • v${version}`)}`;
}
