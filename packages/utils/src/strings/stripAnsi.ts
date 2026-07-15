import stripAnsiImpl from 'strip-ansi';

/** Removes ANSI escape sequences from a string, for a non-terminal sink that would show them raw. */
export function stripAnsi(value: string): string {
    return stripAnsiImpl(value);
}
