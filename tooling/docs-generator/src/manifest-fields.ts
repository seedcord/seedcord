// docs-engine bundles this entry into the docs site. keep it free of imports
export const PAGE_FIELDS = ['readme', 'changelogUrl', 'folderUrl', 'description'] as const;

export type PageField = (typeof PAGE_FIELDS)[number];

export type PageFields = Partial<Record<PageField, string>>;

// a manifest or project file from before a field existed leaves it out
export function pageFields(source: Partial<Record<PageField, unknown>>): PageFields {
    const fields: PageFields = {};
    for (const field of PAGE_FIELDS) {
        const value = source[field];
        if (typeof value === 'string' && value.length > 0) fields[field] = value;
    }
    return fields;
}
