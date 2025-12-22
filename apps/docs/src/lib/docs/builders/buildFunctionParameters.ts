// buildFunctionParameters.ts
import { formatCommentRich } from '../comments/formatter';
import { renderInlineType } from '../comments/renderers/renderInlineType';
import { highlightCode } from '../formatting';

import type { FunctionSignatureParameterModel, FormatContext } from '../types';
import type { DocSignature, InlineType, RenderedSignature } from '@seedcord/docs-engine';

export const isInlineType = (v: unknown): v is InlineType =>
    !!v && typeof v === 'object' && Array.isArray((v as { parts?: unknown }).parts);

const paramTypeString = (renderedType: unknown, context: FormatContext): string | undefined =>
    isInlineType(renderedType) ? renderInlineType(renderedType, context) : undefined;

export async function buildFunctionParameters(
    signature: DocSignature,
    rendered: RenderedSignature | undefined,
    context: FormatContext
): Promise<FunctionSignatureParameterModel[]> {
    const tasks = signature.parameters.map(async (param, index) => {
        const r = rendered?.parameters[index];
        const typeStr = paramTypeString(r?.type, context);
        const defaultValue = r?.defaultValue ?? param.defaultValue;

        const formatted = await formatCommentRich(param.comment, context);
        const label = param.name + (param.flags.isOptional ? '?' : '');
        let displayText = label;
        if (typeStr) displayText += `: ${typeStr}`;
        if (defaultValue !== undefined) displayText += ` = ${defaultValue}`;

        const model: FunctionSignatureParameterModel = {
            name: param.name,
            optional: param.flags.isOptional,
            documentation: formatted.paragraphs,
            display: await highlightCode(displayText)
        };

        if (typeStr) model.type = typeStr;
        if (defaultValue !== undefined) model.defaultValue = String(defaultValue);

        return model;
    });

    return Promise.all(tasks);
}
