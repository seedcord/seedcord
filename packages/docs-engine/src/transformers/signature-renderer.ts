import { ReflectionKind } from 'typedoc';

import { renderInlineType, textPart } from './type-renderer';

import type {
    DocFlags,
    DocInheritance,
    DocSignature,
    DocSignatureParameter,
    DocType,
    DocTypeParameter,
    InlineType,
    RenderedDeclarationHeader,
    RenderedSignature,
    SigPart
} from '../types';
import type { TransformContext } from './transform-context';

interface RenderedParameter {
    name: string;
    optional: boolean;
    type?: InlineType;
    defaultValue?: string;
}

interface RenderedTypeParameter {
    name: string;
    constraint?: InlineType;
    default?: InlineType;
}

const renderParameter = (ctx: TransformContext, parameter: DocSignatureParameter): RenderedParameter => {
    const result: RenderedParameter = {
        name: parameter.name,
        optional: Boolean(parameter.flags.isOptional)
    };

    if (parameter.type) {
        const parameterType = renderInlineType(ctx, parameter.type);
        if (parameterType) {
            result.type = parameterType;
        }
    }

    if (typeof parameter.defaultValue === 'string') {
        result.defaultValue = parameter.defaultValue;
    }

    return result;
};

const renderTypeParameter = (ctx: TransformContext, parameter: DocTypeParameter): RenderedTypeParameter => {
    const rendered: RenderedTypeParameter = { name: parameter.name };

    if (parameter.constraint) {
        const constraint = renderInlineType(ctx, parameter.constraint);
        if (constraint) {
            rendered.constraint = constraint;
        }
    }

    if (parameter.default) {
        const defaultType = renderInlineType(ctx, parameter.default);
        if (defaultType) {
            rendered.default = defaultType;
        }
    }

    return rendered;
};

export const renderSignatureView = (ctx: TransformContext, signature: DocSignature): RenderedSignature => {
    const parameters = signature.parameters.map((parameter) => renderParameter(ctx, parameter));
    const view: RenderedSignature = {
        name: [textPart(signature.name)],
        parameters
    };

    if (signature.typeParameters.length > 0) {
        view.typeParams = signature.typeParameters.map((param) => renderTypeParameter(ctx, param));
    }

    const returnType = renderInlineType(ctx, signature.type ?? undefined);
    if (returnType) {
        view.returnType = returnType;
    }

    return view;
};

interface DeclarationHeaderOptions {
    kind: ReflectionKind;
    flags: DocFlags;
    typeParams: DocTypeParameter[];
    inheritance: DocInheritance;
    valueType?: DocType | null | undefined;
}

const declarationKeywordForKind = (kind: ReflectionKind, flags: DocFlags): string | null => {
    switch (kind) {
        case ReflectionKind.Class:
            return 'class';
        case ReflectionKind.Interface:
            return 'interface';
        case ReflectionKind.Enum:
            return 'enum';
        case ReflectionKind.TypeAlias:
            return 'type';
        case ReflectionKind.Function:
            return 'function';
        case ReflectionKind.Variable:
            if (flags.isConst) {
                return 'const';
            }
            return 'var';
        default:
            return null;
    }
};

const renderHeritage = (ctx: TransformContext, list?: DocType[]): InlineType[] | undefined => {
    if (!list || list.length === 0) {
        return undefined;
    }

    const rendered = list
        .map((entry) => renderInlineType(ctx, entry))
        .filter((entry): entry is InlineType => Boolean(entry));

    return rendered.length > 0 ? rendered : undefined;
};

const applyModifiers = (flags: DocFlags): string[] => {
    const modifiers: string[] = [];
    if (flags.isAbstract) {
        modifiers.push('abstract');
    }
    if (flags.isAsync) {
        modifiers.push('async');
    }
    if (flags.access) {
        modifiers.push(flags.access);
    }

    return modifiers;
};

export const renderDeclarationHeader = (
    ctx: TransformContext,
    name: string,
    options: DeclarationHeaderOptions
): RenderedDeclarationHeader => {
    const keyword = declarationKeywordForKind(options.kind, options.flags);
    const header: RenderedDeclarationHeader = {
        name,
        keyword,
        modifiers: applyModifiers(options.flags)
    };

    if (options.typeParams.length > 0) {
        header.typeParams = options.typeParams.map((param) => renderTypeParameter(ctx, param));
    }

    const heritageExtends = renderHeritage(ctx, options.inheritance.extends);
    const heritageImplements = renderHeritage(ctx, options.inheritance.implements);

    if (heritageExtends || heritageImplements) {
        header.heritage = {};
        if (heritageExtends) {
            header.heritage.extends = heritageExtends;
        }
        if (heritageImplements) {
            header.heritage.implements = heritageImplements;
        }
    }

    if ((options.kind === ReflectionKind.Variable || options.kind === ReflectionKind.Property) && options.valueType) {
        const renderedType = renderInlineType(ctx, options.valueType);
        if (renderedType) {
            header.type = renderedType;
        }
    }

    if (options.kind === ReflectionKind.TypeAlias && options.valueType) {
        const renderedValue = renderInlineType(ctx, options.valueType);
        if (renderedValue) {
            header.value = renderedValue;
        }
    }

    return header;
};

export const formatRenderedDeclarationHeader = (header: RenderedDeclarationHeader): string => {
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
};

export { renderInlineType };

export const sigPartsToText = (parts: SigPart[]): string => {
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
};

export const inlineTypeToText = (inline?: InlineType): string => (inline ? sigPartsToText(inline.parts) : '');

export const formatRenderedSignature = (render: RenderedSignature): string => {
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
};
