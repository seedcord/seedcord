/** One package's re-export list paired with every name its own entry points export. */
export interface PackageReexports {
    name: string;
    reexports: readonly { name: string; packageName?: string }[];
    exportedNames: readonly string[];
}

/**
 * Find every symbol a package re-exports that its declaring package never exports. No package gives
 * those a page, so the docs drop them. A symbol the owner exports and tags `@internal` is allowed,
 * since the owner made that call. Returns one message per offender.
 */
export function findReexportsMissingFromOwner(packages: readonly PackageReexports[]): string[] {
    const exportedByPackage = new Map(packages.map((pkg) => [pkg.name, new Set(pkg.exportedNames)]));

    return packages.flatMap((pkg) =>
        pkg.reexports.reduce<string[]>((missing, reference) => {
            const owner = reference.packageName;
            // an owner outside this map is an external package, which carries its own docs
            const ownerExports = owner === undefined ? undefined : exportedByPackage.get(owner);
            if (ownerExports && !ownerExports.has(reference.name)) {
                missing.push(`${pkg.name} re-exports ${reference.name}, which ${owner} never exports`);
            }
            return missing;
        }, [])
    );
}
