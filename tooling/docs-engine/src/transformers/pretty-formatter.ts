import { format } from 'prettier';

import type { DocReference, InlineType, RenderedDeclarationHeader, RenderedSignature, SigPart } from '#src/types';
import type { Options } from 'prettier';

export type ResolveHref = (reference: DocReference) => string | null | undefined;

export interface RefRange {
    name: string;
    href: string | null;
    start: number;
    end: number;
}

export interface FormattedOutput {
    text: string;
    refs: readonly RefRange[];
}

const PRETTIER_OPTIONS: Options = {
    parser: 'typescript',
    printWidth: 80,
    tabWidth: 4,
    semi: true,
    trailingComma: 'none'
};

// Pattern matches our placeholder identifiers in the prettier output. The width-suffix `__` is
// kept so longer indices (>=10) don't substring-collide with shorter ones during scan.
const MARKER_RE = /__seedcordRef\d+__/g;

interface InternalRef {
    marker: string;
    name: string;
    href: string | null;
}

function makeMarker(index: number): string {
    return `__seedcordRef${index}__`;
}

function appendStripped(parts: readonly SigPart[], buf: string[], refs: InternalRef[], resolve: ResolveHref): void {
    for (const part of parts) {
        if (part.kind === 'space') {
            const last = buf.at(-1);
            if (last && !last.endsWith(' ')) buf.push(' ');
            continue;
        }
        if (part.kind === 'ref') {
            const marker = makeMarker(refs.length);
            const href = resolve(part.ref) ?? null;
            refs.push({ marker, name: part.text, href });
            buf.push(marker);
            continue;
        }
        buf.push(part.text);
    }
}

function inlineStripped(inline: InlineType | undefined, refs: InternalRef[], resolve: ResolveHref): string {
    if (!inline) return '';
    const buf: string[] = [];
    appendStripped(inline.parts, buf, refs, resolve);
    return buf.join('');
}

// single-pass and offset-correct, since this only appends to `out` and never rewrites it
function substituteRefs(formatted: string, refs: readonly InternalRef[]): FormattedOutput {
    if (refs.length === 0) return { text: formatted, refs: [] };

    const byMarker = new Map<string, InternalRef>();
    for (const ref of refs) byMarker.set(ref.marker, ref);

    const ranges: RefRange[] = [];
    let out = '';
    let lastIdx = 0;
    let match: RegExpExecArray | null;
    MARKER_RE.lastIndex = 0;
    while ((match = MARKER_RE.exec(formatted)) !== null) {
        const ref = byMarker.get(match[0]);
        if (!ref) continue;

        out += formatted.slice(lastIdx, match.index);
        const start = out.length;
        out += ref.name;
        ranges.push({ name: ref.name, href: ref.href, start, end: out.length });
        lastIdx = match.index + match[0].length;
    }
    out += formatted.slice(lastIdx);
    return { text: out, refs: ranges };
}

// Method-shape inputs (`name<T>(p): R`) aren't valid top-level TS. Wrapping as a function
// declaration lets prettier (and downstream shiki) parse a complete statement, and the body
// gets extracted afterward. The function wrap also tokenizes multi-line type-param constraints
// correctly, which `class _ {…}` does not, because TextMate grammar fails across newlines inside a class body.
async function tryPrettierAsMethod(stripped: string): Promise<string | null> {
    try {
        const formatted = await format(`function ${stripped} {}`, PRETTIER_OPTIONS);
        const prefixRe = /^function\s+/;
        const suffixRe = /\s*\{\s*\}\s*;?\s*$/;
        return formatted.replace(prefixRe, '').replace(suffixRe, '').trim();
    } catch {
        return null;
    }
}

const TRAILING_BLOCK_PROBE_RE = /\s*\{\s*\}\s*$/;

function needsBlockProbe(keyword: string | null | undefined): boolean {
    return keyword === 'class' || keyword === 'interface' || keyword === 'enum';
}

async function tryPrettierAsDeclaration(stripped: string, keyword: string | null | undefined): Promise<string | null> {
    const probe = needsBlockProbe(keyword) ? `${stripped} {}` : stripped;
    try {
        const raw = await format(probe, PRETTIER_OPTIONS);
        const formatted = raw.trim();
        return formatted.replace(TRAILING_BLOCK_PROBE_RE, '').trim();
    } catch {
        return null;
    }
}

function joinSignatureStripped(render: RenderedSignature, refs: InternalRef[], resolve: ResolveHref): string {
    const nameBuf: string[] = [];
    appendStripped(render.name, nameBuf, refs, resolve);
    const nameText = nameBuf.join('');

    const typeParams =
        render.typeParams && render.typeParams.length > 0
            ? `<${render.typeParams
                  .map((param) => {
                      let label = param.name;
                      if (param.constraint) label += ` extends ${inlineStripped(param.constraint, refs, resolve)}`;
                      if (param.default) label += ` = ${inlineStripped(param.default, refs, resolve)}`;
                      return label;
                  })
                  .join(', ')}>`
            : '';

    const parameters = render.parameters
        .map((param) => {
            const optional = param.optional ? '?' : '';
            const typeText = param.type ? `: ${inlineStripped(param.type, refs, resolve)}` : '';
            const defaultValue = param.defaultValue ? ` = ${param.defaultValue}` : '';
            return `${param.name}${optional}${typeText}${defaultValue}`;
        })
        .join(', ');

    const returnType = render.returnType ? `: ${inlineStripped(render.returnType, refs, resolve)}` : '';

    return `${nameText}${typeParams}(${parameters})${returnType}`.trim();
}

function joinDeclarationStripped(header: RenderedDeclarationHeader, refs: InternalRef[], resolve: ResolveHref): string {
    const segments: string[] = [];
    if (header.modifiers.length > 0) segments.push(header.modifiers.join(' '));
    if (header.keyword) segments.push(header.keyword);

    let declarationName = header.name;
    if (header.typeParams && header.typeParams.length > 0) {
        const renderedParams = header.typeParams
            .map((param) => {
                let label = param.name;
                if (param.constraint) label += ` extends ${inlineStripped(param.constraint, refs, resolve)}`;
                if (param.default) label += ` = ${inlineStripped(param.default, refs, resolve)}`;
                return label;
            })
            .join(', ');
        declarationName += `<${renderedParams}>`;
    }
    if (header.type) declarationName += `: ${inlineStripped(header.type, refs, resolve)}`;
    if (header.value) declarationName += ` = ${inlineStripped(header.value, refs, resolve)}`;
    segments.push(declarationName);

    if (header.heritage?.extends && header.heritage.extends.length > 0) {
        const clause = header.heritage.extends.map((entry) => inlineStripped(entry, refs, resolve)).join(', ');
        segments.push(`extends ${clause}`);
    }
    if (header.heritage?.implements && header.heritage.implements.length > 0) {
        const clause = header.heritage.implements.map((entry) => inlineStripped(entry, refs, resolve)).join(', ');
        segments.push(`implements ${clause}`);
    }

    return segments
        .filter((segment) => segment.length > 0)
        .join(' ')
        .trim();
}

/**
 * `text` is prettier-formatted TS with type references rendered as their plain names.
 * `refs` is the offset map. Each entry's `[start, end)` slice of `text` equals its `name`,
 * and `href` is the URL the consumer should target (e.g. via shiki decorations). When prettier
 * fails (rare) the unformatted joined text is returned with offsets recomputed against it.
 */
export async function formatRenderedSignaturePretty(
    render: RenderedSignature,
    resolveHref: ResolveHref
): Promise<FormattedOutput> {
    const refs: InternalRef[] = [];
    const stripped = joinSignatureStripped(render, refs, resolveHref);
    const formatted = await tryPrettierAsMethod(stripped);
    return substituteRefs(formatted ?? stripped, refs);
}

/**
 * Like {@link formatRenderedSignaturePretty}, for declaration headers. Class/interface/enum get a `{}`
 * body probe before prettier (syntactically incomplete without one). The probe is stripped from the output.
 */
export async function formatRenderedDeclarationHeaderPretty(
    header: RenderedDeclarationHeader,
    resolveHref: ResolveHref
): Promise<FormattedOutput> {
    const refs: InternalRef[] = [];
    const stripped = joinDeclarationStripped(header, refs, resolveHref);
    const formatted = await tryPrettierAsDeclaration(stripped, header.keyword);
    return substituteRefs(formatted ?? stripped, refs);
}

export interface TypeParameter {
    name: string;
    constraint?: InlineType;
    default?: InlineType;
}

/**
 * Class-body-shaped (no leading keyword), so the consumer highlights with the member-wrap variant.
 * Synchronous (the row is always short, no prettier pass) but returns a Promise so its call shape
 * mirrors the other formatters and composes in async builder chains.
 */
export function formatTypeParameterPretty(param: TypeParameter, resolveHref: ResolveHref): Promise<FormattedOutput> {
    const refs: InternalRef[] = [];
    let label = param.name;
    if (param.constraint) label += ` extends ${inlineStripped(param.constraint, refs, resolveHref)}`;
    if (param.default) label += ` = ${inlineStripped(param.default, refs, resolveHref)}`;
    return Promise.resolve(substituteRefs(label, refs));
}

/**
 * For embedding a type expression inside a caller-composed structure (a parameter row's `name: <type>`,
 * a `returnType` field). No prettier pass: the input is already short and well-formed.
 */
export function formatInlineTypePretty(inline: InlineType, resolveHref: ResolveHref): Promise<FormattedOutput> {
    const refs: InternalRef[] = [];
    const stripped = inlineStripped(inline, refs, resolveHref);
    return Promise.resolve(substituteRefs(stripped, refs));
}
