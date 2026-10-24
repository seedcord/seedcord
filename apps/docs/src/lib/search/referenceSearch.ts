import { ReferenceSearch, REFERENCE_SEARCH_URL } from '@seedcord/docs-search';

export const referenceSearch = new ReferenceSearch(new URL(REFERENCE_SEARCH_URL).pathname);
