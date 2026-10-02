import { DOCS } from '@seedcord/ui/sites';

const EXTENSION = '.json';
const ROOT = `${DOCS.path}/search`;

export const PACKAGES_URL = `${ROOT}/packages${EXTENSION}`;

export const searchFileName = (version: string): string => `${version}${EXTENSION}`;

export const searchFileUrl = (packageId: string, version: string): string =>
    `${ROOT}/${encodeURIComponent(packageId)}/${searchFileName(version)}`;

export function versionFromFile(file: string): string | undefined {
    return file.endsWith(EXTENSION) ? file.slice(0, -EXTENSION.length) : undefined;
}
