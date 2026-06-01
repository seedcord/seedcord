import type { InlineType, RenderedDeclarationHeader, RenderedSignature, SigPart } from '../types';

export function sigPartsToText(parts: SigPart[]): string {
    let result = '';
    for (const part of parts) {
        if (part.kind === 'space') {
            if (!result.endsWith(' ')) {
                result += ' ';
            }
            continue;
        }

        result += part.text;
    }

    return result.trim();
}

export function inlineTypeToText(inline?: InlineType): string {
    return inline ? sigPartsToText(inline.parts) : '';
}

export function formatRenderedDeclarationHeader(header: RenderedDeclarationHeader): string {
    const segments: string[] = [];
    if (header.modifiers.length > 0) {
        segments.push(header.modifiers.join(' '));
    }

    if (header.keyword) {
        segments.push(header.keyword);
    }

    let declarationName = header.name;
    if (header.typeParams && header.typeParams.length > 0) {
        const renderedParams = header.typeParams
            .map((param) => {
                let label = param.name;
                if (param.constraint) {
                    label += ` extends ${inlineTypeToText(param.constraint)}`;
                }
                if (param.default) {
                    label += ` = ${inlineTypeToText(param.default)}`;
                }
                return label;
            })
            .join(', ');
        declarationName += `<${renderedParams}>`;
    }

    if (header.type) {
        declarationName += `: ${inlineTypeToText(header.type)}`;
    }

    if (header.value) {
        declarationName += ` = ${inlineTypeToText(header.value)}`;
    }

    segments.push(declarationName);

    if (header.heritage?.extends && header.heritage.extends.length > 0) {
        const clause = header.heritage.extends.map((entry) => inlineTypeToText(entry)).join(', ');
        segments.push(`extends ${clause}`);
    }

    if (header.heritage?.implements && header.heritage.implements.length > 0) {
        const clause = header.heritage.implements.map((entry) => inlineTypeToText(entry)).join(', ');
        segments.push(`implements ${clause}`);
    }

    return segments
        .filter((segment) => segment.length > 0)
        .join(' ')
        .trim();
}

export function formatRenderedSignature(render: RenderedSignature): string {
    const nameText = sigPartsToText(render.name);
    const typeParams =
        render.typeParams && render.typeParams.length > 0
            ? `<${render.typeParams.map((param) => param.name).join(', ')}>`
            : '';
    const parameters = render.parameters
        .map((param) => {
            const optional = param.optional ? '?' : '';
            const typeText = param.type ? `: ${inlineTypeToText(param.type)}` : '';
            const defaultValue = param.defaultValue ? ` = ${param.defaultValue}` : '';
            return `${param.name}${optional}${typeText}${defaultValue}`;
        })
        .join(', ');
    const returnType = render.returnType ? `: ${inlineTypeToText(render.returnType)}` : '';

    return `${nameText}${typeParams}(${parameters})${returnType}`.trim();
}
