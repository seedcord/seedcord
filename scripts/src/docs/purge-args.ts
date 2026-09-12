// purge-cdn-cache.ts runs main() on import, so the arg-to-body logic lives here where the tests can
// import it without that side effect.

export type PurgeBody = { purge_everything: true } | { files: string[] } | { prefixes: string[] };

function parseListArg(argv: readonly string[], flag: string): string[] {
    const index = argv.indexOf(flag);
    if (index === -1) return [];
    return argv.slice(index + 1).filter((value) => !value.startsWith('--'));
}

// prefixes win, so the more targeted flag applies if both are passed by mistake. a flag present with
// no values throws immediately, so a forgotten value never silently purges the whole zone.
export function buildPurgeBody(argv: readonly string[]): PurgeBody {
    const prefixes = parseListArg(argv, '--prefixes');
    if (prefixes.length > 0) return { prefixes };
    if (argv.includes('--prefixes')) throw new Error('--prefixes was given with no values');
    const files = parseListArg(argv, '--files');
    if (files.length > 0) return { files };
    if (argv.includes('--files')) throw new Error('--files was given with no values');
    return { purge_everything: true };
}
