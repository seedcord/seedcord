export function isInteractive(): boolean {
    return (
        process.stdin.isTTY === true &&
        process.stdout.isTTY === true &&
        // some CI fakes a TTY
        !process.env.CI
    );
}
