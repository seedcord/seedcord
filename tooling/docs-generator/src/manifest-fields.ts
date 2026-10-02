// docs-engine bundles this entry into the docs site. keep it free of imports
export const PAGE_FIELDS = ['readme', 'changelogUrl', 'folderUrl', 'description'] as const;

export type PageField = (typeof PAGE_FIELDS)[number];
