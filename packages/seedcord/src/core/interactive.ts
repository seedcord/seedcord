export function isInteractive(opts: { yes?: boolean }, hasActionFlags: boolean): boolean {
    return (
        !hasActionFlags &&
        process.stdin.isTTY === true &&
        process.stdout.isTTY === true &&
        // some CI fakes a TTY, so check the env var too
        !process.env.CI &&
        !opts.yes
    );
}
