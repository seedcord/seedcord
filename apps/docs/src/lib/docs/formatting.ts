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

import { sanitizeHtml } from '@lib/sanitizeHtml';
import {
    highlightMemberToHtml,
    highlightSignatureToHtml,
    highlightToHtml,
    highlightTypeParamToHtml,
    type CodeLink
} from '@lib/shiki';

import { opensInNewTab } from './crossPackage';

import type { CodeRepresentation, FormatContext } from './types';

function buildResolveHref(context: FormatContext): ResolveHref {
    return (reference) => context.engine.resolver().href(context.manifestPackage, reference);
}

function refsToLinks(refs: readonly RefRange[], currentPackage: string): CodeLink[] {
    const links: CodeLink[] = [];
    for (const r of refs) {
        if (r.href) {
            links.push({
                name: r.name,
                href: r.href,
                start: r.start,
                end: r.end,
                external: opensInNewTab(r.href, currentPackage)
            });
        }
    }
    return links;
}

// A type link whose range crosses a shiki span boundary is split by DOMPurify's HTML5 reparse into
// the real anchor plus an empty seam anchor (the parser copies the href onto the reopened tag).
// Drop the empty seams; the fixpoint loop handles back-to-back boundaries.
const EMPTY_ANCHOR = /<a\b[^>]*>\s*<\/a>/g;

async function safeHighlight(
    highlight: (code: string) => Promise<string | null>,
    code: string
): Promise<string | null> {
    const html = await highlight(code);
    if (html === null) return null;
    let sanitized = sanitizeHtml(html);
    let previous: string;
    do {
        previous = sanitized;
        sanitized = sanitized.replace(EMPTY_ANCHOR, '');
    } while (sanitized !== previous);
    return sanitized;
}

export async function formatDeclarationHeader(
    header: RenderedDeclarationHeader,
    context: FormatContext
): Promise<CodeRepresentation> {
    const { text, refs } = await formatRenderedDeclarationHeaderPretty(header, buildResolveHref(context));
    const links = refsToLinks(refs, context.manifestPackage);
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
    context: FormatContext,
    prefix?: string
): Promise<CodeRepresentation> {
    const { text, refs } = await formatRenderedSignaturePretty(signature, buildResolveHref(context));
    if (!prefix) {
        const links = refsToLinks(refs, context.manifestPackage);
        return { text, html: await safeHighlight((c) => highlightSignatureToHtml(c, links), text) };
    }
    // A modifier prefix (`async`, `public get`, ...) sits outside the engine's offset map, so shift
    // every ref past it and highlight the prefixed text with the shifted links.
    const offset = prefix.length + 1;
    const prefixedText = `${prefix} ${text}`;
    const links = refsToLinks(refs, context.manifestPackage).map((link) => ({
        ...link,
        start: link.start + offset,
        end: link.end + offset
    }));
    return {
        text: prefixedText,
        html: await safeHighlight((c) => highlightSignatureToHtml(c, links), prefixedText)
    };
}

export async function highlightCode(code: string, lang = 'ts'): Promise<CodeRepresentation> {
    const language = (lang || 'ts') as 'ts';
    return {
        text: code,
        html: await safeHighlight((c) => highlightToHtml(c, language), code)
    };
}

export async function formatTypeParameter(param: TypeParameter, context: FormatContext): Promise<CodeRepresentation> {
    const { text, refs } = await formatTypeParameterPretty(param, buildResolveHref(context));
    const links = refsToLinks(refs, context.manifestPackage);
    return { text, html: await safeHighlight((c) => highlightTypeParamToHtml(c, links), text) };
}

// For metadata fields (`model.returnType`, `model.type`) shown outside a code block, where markdown
// link syntax would render as raw text. Returns plain text with refs resolved, no markup.
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

// Uses the member-wrap (`class _ { … }`) so shiki's TS grammar tokenizes the `name: type` shape as a
// class-field declaration, not as a labeled statement.
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
    const links = refsToLinks(refs, context.manifestPackage);
    return { text, html: await safeHighlight((c) => highlightMemberToHtml(c, links), text) };
}
