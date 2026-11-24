import { isValid, isValidRange, satisfies } from 'verkit';

export type RuntimeCheck =
    | { status: 'supported' }
    | { status: 'untested'; name: 'Deno' }
    | { status: 'unsupported'; name: 'Node' | 'Bun'; range: string; running: string };

// keep this file's imports to verkit. the seedcord bin loads it on a runtime that may be too old for the rest of core
export function checkRuntime(): RuntimeCheck {
    const { bun, deno, node } = process.versions;
    // bun also reports a node version
    if (bun !== undefined) return checkVersion('Bun', process.env.PACKAGE_BUN_RANGE, bun);
    // deno's node version is the one it emulates
    if (deno !== undefined) return { status: 'untested', name: 'Deno' };
    return checkVersion('Node', process.env.PACKAGE_NODE_RANGE, node);
}

// tsdown-config bakes each range in from seedcord.runtime in this package's package.json
function checkVersion(name: 'Node' | 'Bun', range: string | undefined, running: string): RuntimeCheck {
    if (!range || !isValidRange(range) || !isValid(running) || satisfies(running, range, { includePrerelease: true }))
        return { status: 'supported' };

    return { status: 'unsupported', name, range, running };
}
