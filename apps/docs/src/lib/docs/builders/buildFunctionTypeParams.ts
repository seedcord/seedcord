import { formatCommentRich } from '#lib/docs/comments/formatter';
import { formatTypeParameter, inlineTypeText } from '#lib/docs/formatting';

import { isInlineType } from './buildFunctionParameters';

import type { FunctionTypeParameterModel, FormatContext } from '#lib/docs/types';
import type { RenderedSignature, DocSignature, TypeParameter } from '@seedcord/docs-engine';

export async function buildFunctionTypeParams(
    signature: DocSignature | undefined,
    rendered: RenderedSignature | undefined,
    context: FormatContext
): Promise<FunctionTypeParameterModel[]> {
    const renderedParams = rendered?.typeParams ?? [];
    if (!renderedParams.length) return [];

    return Promise.all(
        renderedParams.map(async (tp, idx) => {
            const constraint = isInlineType(tp.constraint) ? tp.constraint : undefined;
            const defaultVal = isInlineType(tp.default) ? tp.default : undefined;

            const tpInput: TypeParameter = { name: tp.name };
            if (constraint) tpInput.constraint = constraint;
            if (defaultVal) tpInput.default = defaultVal;

            const docParam = signature?.typeParameters[idx];
            const [code, constraintStr, defaultStr, formatted] = await Promise.all([
                formatTypeParameter(tpInput, context),
                constraint ? inlineTypeText(constraint, context) : Promise.resolve(undefined),
                defaultVal ? inlineTypeText(defaultVal, context) : Promise.resolve(undefined),
                docParam?.comment ? formatCommentRich(docParam.comment, context) : Promise.resolve(undefined)
            ]);

            const description = formatted?.paragraphs.length
                ? formatted.paragraphs.map((p) => p.html).join('\n\n')
                : undefined;

            return {
                name: tp.name,
                constraint: constraintStr,
                default: defaultStr,
                description,
                code
            };
        })
    );
}
