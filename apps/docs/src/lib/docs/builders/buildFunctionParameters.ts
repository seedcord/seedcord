import { formatCommentRich } from '#lib/docs/comments/formatter';
import { renderInlineValue } from '#lib/docs/comments/renderers/renderInlineValue';
import { formatParameter, inlineTypeText, type ParameterFormatInput } from '#lib/docs/formatting';

import type { FunctionSignatureParameterModel, FormatContext } from '#lib/docs/types';
import type { DocSignature, InlineType, RenderedSignature } from '@seedcord/docs-engine';

export const isInlineType = (v: unknown): v is InlineType =>
    !!v && typeof v === 'object' && Array.isArray((v as { parts?: unknown }).parts);

export async function buildFunctionParameters(
    signature: DocSignature,
    rendered: RenderedSignature | undefined,
    context: FormatContext
): Promise<FunctionSignatureParameterModel[]> {
    const tasks = signature.parameters.map(async (param, index) => {
        const r = rendered?.parameters[index];
        const type = isInlineType(r?.type) ? r.type : undefined;
        // the {@default} value renders as a separate "Default:" row
        const defaultValue = param.defaultValue;
        const optional = param.flags.isOptional;

        const paramInput: ParameterFormatInput = { name: param.name, optional };
        if (type) paramInput.type = type;

        const [formatted, display, typeStr, defaultParts] = await Promise.all([
            formatCommentRich(param.comment, context),
            formatParameter(paramInput, context),
            type ? inlineTypeText(type, context) : Promise.resolve(undefined),
            defaultValue !== undefined ? renderInlineValue(defaultValue, context) : Promise.resolve(undefined)
        ]);

        const model: FunctionSignatureParameterModel = {
            name: param.name,
            optional,
            documentation: formatted.paragraphs,
            display
        };

        if (typeStr) model.type = typeStr;
        if (defaultParts?.length) model.defaultValue = defaultParts;

        return model;
    });

    return Promise.all(tasks);
}
