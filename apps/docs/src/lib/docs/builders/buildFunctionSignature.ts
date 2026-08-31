import { cloneCommentParagraphs } from '#lib/docs/comments/creators';
import { formatCommentRich } from '#lib/docs/comments/formatter';
import { formatSignature, highlightCode, inlineTypeText } from '#lib/docs/formatting';

import { buildFunctionParameters } from './buildFunctionParameters';
import { buildFunctionTypeParams } from './buildFunctionTypeParams';
import { ensureSignatureAnchor, buildDeprecationStatusFromNodeLike } from './utils';

import type { FormatContext, FunctionSignatureModel } from '#lib/docs/types';
import type { DocSignature } from '@seedcord/docs-engine';

export async function buildFunctionSignature(
    signature: DocSignature,
    context: FormatContext,
    isAsync = false
): Promise<FunctionSignatureModel> {
    const rendered = signature.render;
    const [code, parameters, comment, typeParameters] = await Promise.all([
        rendered ? formatSignature(rendered, context, isAsync ? 'async' : undefined) : highlightCode(signature.name),
        buildFunctionParameters(signature, rendered, context),
        formatCommentRich(signature.comment, context),
        buildFunctionTypeParams(signature, rendered, context)
    ]);

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
        deprecationStatus: buildDeprecationStatusFromNodeLike(signature, comment.deprecation),
        throws: comment.throws?.slice() ?? []
    };

    if (comment.seeAlso?.length) {
        model.seeAlso = comment.seeAlso;
    }

    if (rendered?.returnType) {
        model.returnType = await inlineTypeText(rendered.returnType, context);
    }

    if (signature.sourceUrl) {
        model.sourceUrl = signature.sourceUrl;
    }

    return model;
}
