import { PAGE_FIELDS } from '@seedcord/docs-generator/manifest-fields';

import type { DocManifestPackage } from '#src/types';
import type { PageField } from '@seedcord/docs-generator/manifest-fields';

export type PageFields = Pick<DocManifestPackage, PageField>;

// a manifest or project file from before a field existed leaves it out
export function pageFields(source: Partial<Record<PageField, unknown>>): PageFields {
    const fields: PageFields = {};
    for (const field of PAGE_FIELDS) {
        const value = source[field];
        if (typeof value === 'string' && value.length > 0) fields[field] = value;
    }
    return fields;
}
