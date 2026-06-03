import { formatDisplayPackageName } from '@seedcord/docs-engine/client';

const PACKAGES_PREFIX = '/packages/';
const EXTERNAL_HREF = /^https?:\/\//i;

export function isExternalHref(href: string): boolean {
    return EXTERNAL_HREF.test(href);
}

// True when the link points outside the current package's docs: external https, or internal into a
// different package. The package segment is parsed the same way buildEntityHref / buildPackageBasePath write it.
export function opensInNewTab(href: string, currentPackage: string): boolean {
    if (isExternalHref(href)) return true;
    if (!href.startsWith(PACKAGES_PREFIX)) return false;

    const [targetSegment] = href.slice(PACKAGES_PREFIX.length).split('/', 1);
    const currentSegment = encodeURIComponent(formatDisplayPackageName(currentPackage));

    return !!targetSegment && targetSegment !== currentSegment;
}
