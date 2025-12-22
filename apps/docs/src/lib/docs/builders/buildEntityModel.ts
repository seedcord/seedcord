import { resolveHeaderSignature } from './utils';
import { formatDisplayPackageName } from '../packages';
import { buildBaseEntityModel } from './baseEntityModel';
import { buildClassLikeEntity } from './buildClassLikeEntity';
import { buildEnumEntity } from './buildEnumEntity';
import { buildFunctionEntity } from './buildFunctionEntity';
import { buildTypeEntity } from './buildTypeEntity';
import { buildVariableEntity } from './buildVariableEntity';
import { resolveEntityKind } from './resolveEntityKind';
import { createFormatContext } from '../comments/creators';
import { formatCommentRich } from '../comments/formatter';

import type { EntityModel } from '../types';
import type { DocNode, DocsEngine } from '@seedcord/docs-engine';

export async function buildEntityModel(engine: DocsEngine, node: DocNode): Promise<EntityModel> {
    const manifestPackage = node.packageName;
    const context = createFormatContext(engine, manifestPackage);
    const formattedSummary = await formatCommentRich(node.comment, context);
    const signature = await resolveHeaderSignature(node, context);
    const kind = resolveEntityKind(node);

    const base = buildBaseEntityModel({
        node,
        kind,
        manifestPackage,
        displayPackage: formatDisplayPackageName(manifestPackage),
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
