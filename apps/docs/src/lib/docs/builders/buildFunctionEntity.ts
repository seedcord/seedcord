import { buildFunctionSignature } from './buildFunctionSignature';

import type { BaseEntityModel, FormatContext, FunctionEntityModel } from '../types';
import type { DocNode } from '@seedcord/docs-engine';

export async function buildFunctionEntity(
    base: BaseEntityModel & { kind: 'function' },
    node: DocNode,
    context: FormatContext
): Promise<FunctionEntityModel> {
    const signatures = await Promise.all(
        node.signatures.map((sig) => buildFunctionSignature(sig, context, Boolean(node.flags.isAsync)))
    );
    const summaryToUse = base.summary.length ? base.summary : (signatures[0]?.summary ?? base.summary);
    return { ...base, summary: summaryToUse, signatures };
}
