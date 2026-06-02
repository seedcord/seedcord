/** Thrown when the root `index.json` cannot be fetched, parsed, or validated. */
export class IndexFetchError extends Error {
    constructor(
        public readonly status: number | null,
        message: string
    ) {
        super(message);
        this.name = 'IndexFetchError';
    }
}

/** Thrown when a package's `project.json` cannot be fetched, parsed, or validated. */
export class ProjectFetchError extends Error {
    constructor(
        public readonly status: number | null,
        message: string
    ) {
        super(message);
        this.name = 'ProjectFetchError';
    }
}

/** Thrown when a `(package, version)` selection has no entry in the index. */
export class PackageVersionNotFoundError extends Error {
    constructor(
        public readonly packageName: string,
        public readonly version: string
    ) {
        super(`No documentation found for "${packageName}" at version "${version}"`);
        this.name = 'PackageVersionNotFoundError';
    }
}
