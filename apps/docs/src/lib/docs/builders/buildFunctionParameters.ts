import { formatCommentRich } from '../comments/formatter';
import { formatParameter, inlineTypeText, type ParameterFormatInput } from '../formatting';

import type { FunctionSignatureParameterModel, FormatContext } from '../types';
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
        const defaultValue = r?.defaultValue ?? param.defaultValue;
        const optional = param.flags.isOptional;

        const paramInput: ParameterFormatInput = { name: param.name, optional };
        if (type) paramInput.type = type;
        if (defaultValue !== undefined) paramInput.defaultValue = String(defaultValue);

        const [formatted, display, typeStr] = await Promise.all([
            formatCommentRich(param.comment, context),
            formatParameter(paramInput, context),
            type ? inlineTypeText(type, context) : Promise.resolve(undefined)
        ]);

        const model: FunctionSignatureParameterModel = {
            name: param.name,
            optional,
            documentation: formatted.paragraphs,
            display
        };

        if (typeStr) model.type = typeStr;
        if (defaultValue !== undefined) model.defaultValue = String(defaultValue);

        return model;
    });

    return Promise.all(tasks);
}
