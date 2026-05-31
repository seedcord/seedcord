import {
    formatInlineTypePretty,
    formatRenderedDeclarationHeaderPretty,
    formatRenderedSignaturePretty,
    formatTypeParameterPretty,
    type InlineType,
    type RefRange,
    type RenderedDeclarationHeader,
    type RenderedSignature,
    type ResolveHref,
    type TypeParameter
} from '@seedcord/docs-engine';
import { resolveExternalPackageUrl, resolveReferenceHref } from '@seedcord/docs-engine';

import { sanitizeHtml } from '@lib/sanitizeHtml';
import {
    highlightMemberToHtml,
    highlightSignatureToHtml,
    highlightToHtml,
    highlightTypeParamToHtml,
    type CodeLink
} from '@lib/shiki';

import { resolveOptions } from './comments/resolvers';

import type { CodeRepresentation, FormatContext } from './types';

function buildResolveHref(context: FormatContext): ResolveHref {
    const options = resolveOptions(context);
    return (reference) => resolveReferenceHref(reference, options) ?? resolveExternalPackageUrl(reference.name) ?? null;
}

function refsToLinks(refs: readonly RefRange[]): CodeLink[] {
    const links: CodeLink[] = [];
    for (const r of refs) {
        if (r.href) links.push({ name: r.name, href: r.href, start: r.start, end: r.end });
    }
    return links;
}

async function safeHighlight(
    highlight: (code: string) => Promise<string | null>,
    code: string
): Promise<string | null> {
    const html = await highlight(code);
    return html === null ? null : sanitizeHtml(html);
}

export async function formatDeclarationHeader(
    header: RenderedDeclarationHeader,
    context: FormatContext
): Promise<CodeRepresentation> {
    const { text, refs } = await formatRenderedDeclarationHeaderPretty(header, buildResolveHref(context));
    const links = refsToLinks(refs);
    // Property/type-parameter declarations (no leading keyword) need a class-body wrap so shiki
    // tokenizes `protected`/`readonly`/type-param `extends` as keywords; keyword-led top-level
    // declarations (`class Foo`, `type Y = ...`) are valid TS at the file level without it.
    const highlighter = header.keyword
        ? (c: string): Promise<string | null> => highlightToHtml(c, 'ts', links)
        : (c: string): Promise<string | null> => highlightMemberToHtml(c, links);
    return { text, html: await safeHighlight(highlighter, text) };
}

export async function formatSignature(
    signature: RenderedSignature,
    context: FormatContext
): Promise<CodeRepresentation> {
    const { text, refs } = await formatRenderedSignaturePretty(signature, buildResolveHref(context));
    const links = refsToLinks(refs);
    return { text, html: await safeHighlight((c) => highlightSignatureToHtml(c, links), text) };
}

export async function highlightCode(code: string, lang = 'ts'): Promise<CodeRepresentation> {
    const language = (lang || 'ts') as 'ts';
    return {
        text: code,
        html: await safeHighlight((c) => highlightToHtml(c, language), code)
    };
}

// Re-highlight an already-formatted signature text (used when a builder prepends a modifier
// keyword like `public` or `async`). Uses the same function-wrap as `formatSignature` so the
// TS grammar enters the right scope. No links because the prefix-augmented text has lost the
// engine's offset map.
export async function highlightSignatureCode(code: string): Promise<CodeRepresentation> {
    return {
        text: code,
        html: await safeHighlight((c) => highlightSignatureToHtml(c), code)
    };
}

export async function formatTypeParameter(param: TypeParameter, context: FormatContext): Promise<CodeRepresentation> {
    const { text, refs } = await formatTypeParameterPretty(param, buildResolveHref(context));
    const links = refsToLinks(refs);
    return { text, html: await safeHighlight((c) => highlightTypeParamToHtml(c, links), text) };
}

// Plain text of an inline type with refs resolved. Use for metadata fields (`model.returnType`,
// `model.type`) that get displayed outside a code block, where markdown link syntax would render
// as raw text.
export async function inlineTypeText(inline: InlineType, context: FormatContext): Promise<string> {
    const { text } = await formatInlineTypePretty(inline, buildResolveHref(context));
    return text;
}

export interface ParameterFormatInput {
    name: string;
    optional: boolean;
    type?: InlineType;
    defaultValue?: string;
}

// Highlights a parameter row (`name(?): Type [= default]`) with links woven from the type
// portion. Uses the member-wrap (`class _ { … }`) so shiki's TS grammar tokenizes the `name:
// type` shape as a class-field declaration, not as a labeled statement.
export async function formatParameter(
    input: ParameterFormatInput,
    context: FormatContext
): Promise<CodeRepresentation> {
    const refs: RefRange[] = [];
    let text = input.name + (input.optional ? '?' : '');
    if (input.type) {
        const inline = await formatInlineTypePretty(input.type, buildResolveHref(context));
        const offset = text.length + ': '.length;
        text += `: ${inline.text}`;
        for (const r of inline.refs)
            refs.push({ name: r.name, href: r.href, start: r.start + offset, end: r.end + offset });
    }
    if (input.defaultValue !== undefined) text += ` = ${input.defaultValue}`;
    const links = refsToLinks(refs);
    return { text, html: await safeHighlight((c) => highlightMemberToHtml(c, links), text) };
}
