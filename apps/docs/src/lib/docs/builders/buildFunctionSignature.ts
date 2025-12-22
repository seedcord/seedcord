import { cloneCommentParagraphs } from '../comments/creators';
import { formatSignature, highlightCode } from '../formatting';
import { buildFunctionParameters } from './buildFunctionParameters';
import { buildFunctionTypeParams } from './buildFunctionTypeParams';
import { ensureSignatureAnchor, buildDeprecationStatusFromNodeLike } from './utils';
import { formatCommentRich } from '../comments/formatter';
import { renderInlineType } from '../comments/renderers/renderInlineType';

import type { CodeRepresentation, FormatContext, FunctionSignatureModel } from '../types';
import type { DocNode, DocSignature } from '@seedcord/docs-engine';

export async function buildFunctionSignature(
    signature: DocSignature,
    context: FormatContext,
    isAsync = false
): Promise<FunctionSignatureModel> {
    const rendered = signature.render;
    const baseCode: CodeRepresentation = rendered
        ? await formatSignature(rendered, context)
        : await highlightCode(signature.name);

    const code: CodeRepresentation = isAsync ? await highlightCode(`async ${baseCode.text}`) : baseCode;

    const parameters = await buildFunctionParameters(signature, rendered, context);
    const comment = await formatCommentRich(signature.comment, context);
    const typeParameters = await buildFunctionTypeParams(signature, rendered, context);

    const model: FunctionSignatureModel = {
        id: ensureSignatureAnchor(signature),
        code,
        overloadIndex: signature.overloadIndex,
        parameters,
        typeParameters,
        summary: cloneCommentParagraphs(comment.paragraphs),
        examples: comment.examples.slice(),
        deprecationStatus: buildDeprecationStatusFromNodeLike(signature as unknown as DocNode)
    };

    if (rendered?.returnType) {
        model.returnType = renderInlineType(rendered.returnType, context);
    }

    if (signature.sourceUrl) {
        model.sourceUrl = signature.sourceUrl;
    }

    return model;
}
