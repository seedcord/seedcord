import { DEFAULT_MANIFEST_PACKAGE, DEFAULT_VERSION } from '@seedcord/docs-engine/client';

export interface ActiveDocsTarget {
    pkg: string;
    version: string;
}

const PACKAGES_PREFIX = '/packages/';

export function parseActiveDocsTarget(pathname: string): ActiveDocsTarget {
    if (pathname.startsWith(PACKAGES_PREFIX)) {
        const [pkg, version] = pathname.slice(PACKAGES_PREFIX.length).split('/');
        if (pkg && version) {
            return { pkg: decodeURIComponent(pkg), version: decodeURIComponent(version) };
        }
    }

    return { pkg: DEFAULT_MANIFEST_PACKAGE, version: DEFAULT_VERSION };
}
