export function formatVersionLabel(version: string): string {
    return version.startsWith('v') ? version : `v${version}`;
}
