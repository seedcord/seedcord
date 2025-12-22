export const formatVersionLabel = (version: string): string => {
    const v = version.startsWith('v') ? version : `v${version}`;
    return `latest · ${v}`.replace('\u00A0', ' ');
};
