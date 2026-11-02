// tsdown swaps this at build time only where `process` is the global
function builtVersion(): string {
    return process.env.PACKAGE_VERSION ?? '0.0.0';
}

export const version = builtVersion();

// changesets publishes prereleases under the next dist-tag
export function releaseTag(): 'next' | null {
    return builtVersion().includes('-next.') ? 'next' : null;
}
