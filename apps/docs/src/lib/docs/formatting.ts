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

import { sanitizeHtml } from '#lib/sanitizeHtml';
import {
    highlightMemberToHtml,
    highlightSignatureToHtml,
    highlightToHtml,
    highlightTypeParamToHtml,
    type CodeLink
} from '@seedcord/ui/shiki';

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

// dompurify's html5 reparse splits a link that crosses a shiki span boundary into the real anchor plus
// an empty one, because the parser copies the href onto the tag it reopens. the loop repeats for
// back-to-back boundaries.
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
    // with no leading keyword the text isn't top-level TS, and shiki only reads `protected`, `readonly`
    // and type-param `extends` as keywords inside the class-body wrap
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
    // the engine's ref offsets don't count a modifier prefix (`async`, `public get`)
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

// callers render this outside a code block, where markdown link syntax would show as raw text
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

// a bare `name: type` tokenizes as a labeled statement until the member wrap makes it a class field
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
