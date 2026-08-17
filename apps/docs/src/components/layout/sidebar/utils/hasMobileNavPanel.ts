// only renders under packages/[packageId]/[versionId]
export function hasMobileNavPanel(pathname: string): boolean {
    const [, packages, packageId, versionId] = pathname.split('/');
    return packages === 'packages' && Boolean(packageId) && Boolean(versionId);
}
