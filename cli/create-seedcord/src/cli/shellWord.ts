const PLAIN_WORD = /^[\w@+=:./-]+$/;

// sh, powershell and cmd all read a double-quoted `#`, space, comma or `^` as part of one word
// parseDirectory refuses the characters that aren't safe on all major shells
export function shellWord(value: string): string {
    return PLAIN_WORD.test(value) ? value : `"${value}"`;
}

export function commandLine(command: string, args: readonly string[]): string {
    return [command, ...args].map(shellWord).join(' ');
}
