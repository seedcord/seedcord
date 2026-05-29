import { cloneCommentParagraphs } from '../comments/creators';
import { formatSignature, highlightCode, highlightSignatureCode, inlineTypeText } from '../formatting';
import { buildFunctionParameters } from './buildFunctionParameters';
import { buildFunctionTypeParams } from './buildFunctionTypeParams';
import { ensureSignatureAnchor, buildDeprecationStatusFromNodeLike } from './utils';
import { formatCommentRich } from '../comments/formatter';

import type { CodeRepresentation, FormatContext, FunctionSignatureModel } from '../types';
import type { DocSignature } from '@seedcord/docs-engine';

export async function buildFunctionSignature(
    signature: DocSignature,
    context: FormatContext,
    isAsync = false
): Promise<FunctionSignatureModel> {
    const rendered = signature.render;
    const baseCode: CodeRepresentation = rendered
        ? await formatSignature(rendered, context)
        : await highlightCode(signature.name);

    const code: CodeRepresentation = isAsync ? await highlightSignatureCode(`async ${baseCode.text}`) : baseCode;

    const parameters = await buildFunctionParameters(signature, rendered, context);
    const comment = await formatCommentRich(signature.comment, context);
    const typeParameters = await buildFunctionTypeParams(signature, rendered, context);

    const anchor = ensureSignatureAnchor(signature);
    const model: FunctionSignatureModel = {
        id: anchor,
        anchor,
        code,
        overloadIndex: signature.overloadIndex,
        parameters,
        typeParameters,
        summary: cloneCommentParagraphs(comment.paragraphs),
        examples: comment.examples.slice(),
        deprecationStatus: buildDeprecationStatusFromNodeLike(signature),
        throws: comment.throws?.slice() ?? []
    };

    if (rendered?.returnType) {
        model.returnType = await inlineTypeText(rendered.returnType, context);
    }

    if (signature.sourceUrl) {
        model.sourceUrl = signature.sourceUrl;
    }

    return model;
}
