import { DOCS, GUIDE } from '@seedcord/ui/sites';

const EXTENSION = '.json';
export const REFERENCE_SEARCH_URL = DOCS.at('/api/search');
export const GUIDE_SEARCH_URL = GUIDE.at('/api/search');

export const searchFileName = (version: string): string => `${version}${EXTENSION}`;

export const PACKAGES_FILE_NAME = searchFileName('packages');

export const searchFileUrl = (packageId: string, version: string, endpoint = REFERENCE_SEARCH_URL): string =>
    `${endpoint}/${encodeURIComponent(packageId)}/${searchFileName(version)}`;

export function versionFromFile(file: string): string | undefined {
    return file.endsWith(EXTENSION) ? file.slice(0, -EXTENSION.length) : undefined;
}
