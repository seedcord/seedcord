import { formatDisplayPackageName } from '@seedcord/docs-engine';

import { createFormatContext } from '#lib/docs/comments/creators';
import { formatCommentRich } from '#lib/docs/comments/formatter';

import { buildBaseEntityModel } from './baseEntityModel';
import { buildClassLikeEntity } from './buildClassLikeEntity';
import { buildEnumEntity } from './buildEnumEntity';
import { buildFunctionEntity } from './buildFunctionEntity';
import { buildTypeEntity } from './buildTypeEntity';
import { buildVariableEntity } from './buildVariableEntity';
import { resolveEntityKind } from './resolveEntityKind';
import { resolveHeaderSignature } from './utils';

import type { EntityModel } from '#lib/docs/types';
import type { DocNode, VersionedDocsEngine } from '@seedcord/docs-engine';

// mergeEntries seeds `entries` with the root entry before appending any subpath
function importPath(manifestPackage: string, entries: DocNode['entries']): string {
    const display = formatDisplayPackageName(manifestPackage);
    const [subpath] = entries ?? [];
    if (!subpath || subpath === '.') return display;
    return `${display}${subpath.replace(/^\./, '')}`;
}

export async function buildEntityModel(engine: VersionedDocsEngine, node: DocNode): Promise<EntityModel> {
    const manifestPackage = node.packageName;
    const context = createFormatContext(engine, manifestPackage);
    const [formattedSummary, signature] = await Promise.all([
        formatCommentRich(node.comment, context),
        resolveHeaderSignature(node, context)
    ]);
    const kind = resolveEntityKind(node);

    const base = buildBaseEntityModel({
        node,
        kind,
        manifestPackage,
        displayPackage: importPath(manifestPackage, node.entries),
        summary: formattedSummary.paragraphs,
        summaryExamples: formattedSummary.examples,
        signature,
        seeAlso: formattedSummary.seeAlso,
        throws: formattedSummary.throws
    });

    switch (kind) {
        case 'class':
            return buildClassLikeEntity({ ...base, kind: 'class' }, node, context);
        case 'interface':
            return buildClassLikeEntity({ ...base, kind: 'interface' }, node, context);
        case 'enum':
            return buildEnumEntity({ ...base, kind: 'enum' }, node, context);
        case 'type':
            return buildTypeEntity({ ...base, kind: 'type' }, node, context);
        case 'function':
            return buildFunctionEntity({ ...base, kind: 'function' }, node, context);
        default:
            return buildVariableEntity({ ...base, kind: 'variable' });
    }
}
