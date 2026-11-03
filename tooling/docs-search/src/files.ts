import { PRODUCTION_SITES } from '@seedcord/brand';
import { GUIDE } from '@seedcord/ui/sites';

const EXTENSION = '.json';
export const REFERENCE_SEARCH_URL = PRODUCTION_SITES.docs.at('/api/search');

export const GUIDE_ASK_PATH = '/api/ask';
export const GUIDE_ASK_URL = GUIDE.at(GUIDE_ASK_PATH);
export const GUIDE_SECTIONS_PATH = '/api/sections.json';
export const GUIDE_VECTORS_PATH = '/api/vectors.bin';

export const searchFileName = (version: string): string => `${version}${EXTENSION}`;

export const PACKAGES_FILE_NAME = searchFileName('packages');

export const searchFileUrl = (packageId: string, version: string, endpoint = REFERENCE_SEARCH_URL): string =>
    `${endpoint}/${encodeURIComponent(packageId)}/${searchFileName(version)}`;

export function versionFromFile(file: string): string | undefined {
    return file.endsWith(EXTENSION) ? file.slice(0, -EXTENSION.length) : undefined;
}
