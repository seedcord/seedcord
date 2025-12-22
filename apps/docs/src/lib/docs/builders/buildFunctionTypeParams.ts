import { isInlineType } from './buildFunctionParameters';
import { formatCommentRich } from '../comments/formatter';
import { renderInlineType } from '../comments/renderers/renderInlineType';
import { highlightCode } from '../formatting';

import type { FunctionTypeParameterModel, FormatContext } from '../types';
import type { RenderedSignature, DocSignature } from '@seedcord/docs-engine';

export async function buildFunctionTypeParams(
    signature: DocSignature | undefined,
    rendered: RenderedSignature | undefined,
    context: FormatContext
): Promise<FunctionTypeParameterModel[]> {
    const renderedParams = rendered?.typeParams ?? [];
    if (!renderedParams.length) return [];

    return Promise.all(
        renderedParams.map(async (tp, idx) => {
            const constraint = isInlineType(tp.constraint) ? renderInlineType(tp.constraint, context) : undefined;
            const defaultVal = isInlineType(tp.default) ? renderInlineType(tp.default, context) : undefined;

            const codeText = [
                tp.name,
                constraint ? `extends ${constraint}` : undefined,
                defaultVal ? `= ${defaultVal}` : undefined
            ]
                .filter(Boolean)
                .join(' ');

            let description: string | undefined = undefined;
            const docParam = signature ? signature.typeParameters[idx] : undefined;
            if (docParam?.comment) {
                const formatted = await formatCommentRich(docParam.comment, context);
                if (formatted.paragraphs.length) {
                    description = formatted.paragraphs.map((p) => p.html).join('\n\n');
                }
            }

            return {
                name: tp.name,
                constraint,
                default: defaultVal,
                description,
                code: await highlightCode(codeText)
            };
        })
    );
}
