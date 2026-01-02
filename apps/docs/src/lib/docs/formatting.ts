import { format } from 'prettier';

import { highlightToHtml } from '@lib/shiki';

import { renderInlineType } from './comments/renderers/renderInlineType';
import { renderSigParts } from './comments/renderers/renderSigParts';

import type { CodeRepresentation, FormatContext } from './types';
import type { DocComment, RenderedDeclarationHeader, RenderedSignature } from '@seedcord/docs-engine';
import type { Options } from 'prettier';

async function tryFormat(text: string): Promise<string> {
    const options = {
        parser: 'typescript',
        printWidth: 80,
        tabWidth: 4,
        semi: true,
        trailingComma: 'none' as const
    } satisfies Options;

    try {
        return (await format(text, options)).trim();
    } catch {
        try {
            const wrapped = `class _ {\n${text}\n}`;
            const formatted = await format(wrapped, options);
            const match = formatted.match(/class _ \{([\s\S]*)\}/);
            if (match) {
                const body = match[1];
                if (typeof body === 'string') {
                    const lines = body.split('\n');
                    if (lines.length > 0 && lines[0]?.trim() === '') lines.shift();
                    if (lines.length > 0 && lines[lines.length - 1]?.trim() === '') lines.pop();
                    return lines
                        .map((line) => line.replace(/^\s{4}/, ''))
                        .join('\n')
                        .trim();
                }
            }
        } catch {
            // Ignore
        }
    }

    return text;
}

export async function formatDeclarationHeader(
    header: RenderedDeclarationHeader,
    context: FormatContext
): Promise<CodeRepresentation> {
    const segments: string[] = [];

    if (header.modifiers.length) {
        segments.push(header.modifiers.join(' '));
    }

    if (header.keyword) {
        segments.push(header.keyword);
    }

    let nameSegment = header.name;

    if (header.typeParams?.length) {
        const renderedParams = header.typeParams
            .map((param) => {
                const pieces: string[] = [param.name];
                if (param.constraint) {
                    pieces.push(`extends ${renderInlineType(param.constraint, context)}`);
                }
                if (param.default) {
                    pieces.push(`= ${renderInlineType(param.default, context)}`);
                }
                return pieces.join(' ');
            })
            .join(', ');
        nameSegment += `<${renderedParams}>`;
    }

    if (header.type) {
        nameSegment += `: ${renderInlineType(header.type, context)}`;
    }

    if (header.value) {
        nameSegment += ` = ${renderInlineType(header.value, context)}`;
    }

    segments.push(nameSegment);

    if (header.heritage?.extends?.length) {
        const clause = header.heritage.extends.map((entry) => renderInlineType(entry, context)).join(', ');
        segments.push(`extends ${clause}`);
    }

    if (header.heritage?.implements?.length) {
        const clause = header.heritage.implements.map((entry) => renderInlineType(entry, context)).join(', ');
        segments.push(`implements ${clause}`);
    }

    const text = await tryFormat(segments.join(' ').trim());

    return {
        text,
        html: await highlightToHtml(text)
    };
}

export async function formatSignature(
    signature: RenderedSignature,
    context: FormatContext
): Promise<CodeRepresentation> {
    const name = renderSigParts(signature.name, context);

    let typeParams = '';
    if (signature.typeParams?.length) {
        const renderedParams = signature.typeParams
            .map((param) => {
                const pieces: string[] = [param.name];
                if (param.constraint) {
                    pieces.push(`extends ${renderInlineType(param.constraint, context)}`);
                }
                if (param.default) {
                    pieces.push(`= ${renderInlineType(param.default, context)}`);
                }
                return pieces.join(' ');
            })
            .join(', ');
        typeParams = `<${renderedParams}>`;
    }

    const parameters = signature.parameters
        .map((param) => {
            const pieces: string[] = [param.name + (param.optional ? '?' : '')];
            if (param.type) {
                pieces.push(`: ${renderInlineType(param.type, context)}`);
            }
            if (param.defaultValue) {
                pieces.push(`= ${param.defaultValue}`);
            }
            return pieces.join(' ');
        })
        .join(', ');

    const returnType = signature.returnType ? `: ${renderInlineType(signature.returnType, context)}` : '';
    const text = await tryFormat(`${name}${typeParams}(${parameters})${returnType}`.trim());

    return {
        text,
        html: await highlightToHtml(text)
    };
}

export function formatComment(comment: DocComment | null | undefined): string[] {
    if (!comment?.summary) {
        return [];
    }

    return comment.summary
        .split(/\n{2,}/)
        .map((segment) => segment.replace(/\n/g, ' ').trim())
        .filter(Boolean);
}

export async function highlightCode(code: string, lang = 'ts'): Promise<CodeRepresentation> {
    const language = (lang || 'ts') as Parameters<typeof highlightToHtml>[1];

    return {
        text: code,
        html: await highlightToHtml(code, language)
    };
}
