// tsdown swaps this at build time only where `process` is the global
function builtVersion(): string {
    return process.env.PACKAGE_VERSION ?? '0.0.0';
}

export const version = builtVersion();

// a prerelease scaffolder belongs to the next line of the framework packages
export function releaseTag(): 'next' | null {
    return builtVersion().includes('-next.') ? 'next' : null;
}
