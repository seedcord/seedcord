import type {
    DocBlock,
    DocCodeSpan,
    DocComment,
    DocEscapedText,
    DocFencedCode,
    DocInlineTag,
    DocLinkTag,
    DocNode,
    DocParamBlock,
    DocPlainText
} from '@microsoft/tsdoc';
import type {
    CommentDisplayPart,
    DocReference,
    DocComment as EngineComment,
    DocCommentBlockTag,
    DocCommentExample
} from '@src/types';

// undefined renders the link as plain text. the adapter wires this to ApiModel.resolveDeclarationReference.
export type LinkResolver = (linkTagCodeDestination: unknown, fallbackText: string) => DocReference | undefined;

export function codeDestinationName(codeDestination: unknown): string {
    if (!codeDestination || typeof codeDestination !== 'object') return '';
    const dest = codeDestination as {
        memberReferences?: { memberIdentifier?: { identifier?: string } }[];
        packageName?: string;
    };
    const members = dest.memberReferences ?? [];
    const lastName = members.at(-1)?.memberIdentifier?.identifier;
    return lastName ?? dest.packageName ?? '';
}

function pushText(parts: CommentDisplayPart[], text: string): void {
    if (!text) return;
    const last = parts.at(-1);
    if (last?.kind === 'text') last.text += text;
    else parts.push({ kind: 'text', text });
}

function walkLinkTag(link: DocLinkTag, parts: CommentDisplayPart[], resolveLink: LinkResolver): void {
    const explicitText = link.linkText?.length ? link.linkText : undefined;
    if (link.urlDestination) {
        parts.push({
            kind: 'inline-tag',
            tag: '@link',
            text: explicitText ?? link.urlDestination,
            target: link.urlDestination
        });
        return;
    }
    // typedoc rendered `{@link Error}` as "Error"
    const text = explicitText ?? codeDestinationName(link.codeDestination);
    const target = link.codeDestination ? resolveLink(link.codeDestination, text) : undefined;
    parts.push({ kind: 'inline-tag', tag: '@link', text, ...(target && { target }) });
}

function walk(node: DocNode, parts: CommentDisplayPart[], resolveLink: LinkResolver): void {
    switch (node.kind) {
        case 'PlainText': {
            pushText(parts, (node as DocPlainText).text);
            return;
        }
        case 'SoftBreak': {
            pushText(parts, '\n');
            return;
        }
        case 'EscapedText': {
            pushText(parts, (node as DocEscapedText).decodedText);
            return;
        }
        case 'CodeSpan': {
            parts.push({ kind: 'code', text: (node as DocCodeSpan).code });
            return;
        }
        case 'FencedCode': {
            parts.push({ kind: 'code', text: (node as DocFencedCode).code });
            return;
        }
        case 'LinkTag': {
            walkLinkTag(node as DocLinkTag, parts, resolveLink);
            return;
        }
        case 'InlineTag': {
            const inline = node as DocInlineTag;
            if (inline.tagName === '@default') {
                parts.push({ kind: 'inline-tag', tag: '@default', text: inline.tagContent.trim() });
            }
            return;
        }
        case 'Paragraph': {
            for (const child of node.getChildNodes()) walk(child, parts, resolveLink);
            pushText(parts, '\n\n');
            return;
        }
        default: {
            for (const child of node.getChildNodes()) walk(child, parts, resolveLink);
        }
    }
}

function partsFromSection(
    section: { nodes: readonly DocNode[] } | undefined,
    resolveLink: LinkResolver
): CommentDisplayPart[] {
    if (!section) return [];
    const parts: CommentDisplayPart[] = [];
    for (const node of section.nodes) walk(node, parts, resolveLink);
    const last = parts.at(-1);
    if (last?.kind === 'text') last.text = last.text.replace(/\n+$/, '');
    return parts;
}

function plainText(parts: CommentDisplayPart[]): string {
    return parts
        .map((p) => p.text)
        .join('')
        .trim();
}

function blockTag(block: DocBlock, resolveLink: LinkResolver): DocCommentBlockTag {
    const content = partsFromSection(block.content, resolveLink);
    return { tag: block.blockTag.tagName, text: plainText(content), content };
}

export function buildComment(tsdoc: DocComment | undefined, resolveLink: LinkResolver): EngineComment | null {
    if (!tsdoc) return null;

    const summaryParts = partsFromSection(tsdoc.summarySection, resolveLink);

    const blockTags: DocCommentBlockTag[] = [];
    const examples: DocCommentExample[] = [];

    if (tsdoc.remarksBlock) blockTags.push(blockTag(tsdoc.remarksBlock, resolveLink));
    if (tsdoc.deprecatedBlock) blockTags.push(blockTag(tsdoc.deprecatedBlock, resolveLink));

    for (const block of tsdoc.customBlocks) {
        if (block.blockTag.tagNameWithUpperCase === '@EXAMPLE') {
            const content = partsFromSection(block.content, resolveLink);
            examples.push({ content: plainText(content) });
            continue;
        }
        blockTags.push(blockTag(block, resolveLink));
    }

    // the parser puts `@see` in seeBlocks, never customBlocks
    for (const block of tsdoc.seeBlocks) {
        blockTags.push(blockTag(block, resolveLink));
    }

    const modifierTags = tsdoc.modifierTagSet.nodes.map((n) => n.tagName);

    return {
        summary: plainText(summaryParts),
        summaryParts,
        blockTags,
        modifierTags,
        examples
    };
}

export interface ParamComment {
    comment: EngineComment | null;
    defaultValue?: string;
}

function splitParamDefault(parts: CommentDisplayPart[]): { parts: CommentDisplayPart[]; defaultValue?: string } {
    const index = parts.findIndex((p) => p.kind === 'inline-tag' && p.tag === '@default');
    if (index === -1) return { parts };
    const value = parts[index]?.text;
    const cleaned = parts.filter((_, i) => i !== index);
    const last = cleaned.at(-1);
    if (last?.kind === 'text') last.text = last.text.replace(/\s+$/, '');
    return value ? { parts: cleaned, defaultValue: value } : { parts: cleaned };
}

function commentFromParamBlock(block: DocParamBlock | undefined, resolveLink: LinkResolver): ParamComment {
    if (!block) return { comment: null };
    const { parts, defaultValue } = splitParamDefault(partsFromSection(block.content, resolveLink));
    const base = defaultValue !== undefined ? { defaultValue } : {};
    if (parts.length === 0) return { comment: null, ...base };
    const comment = { summary: plainText(parts), summaryParts: parts, blockTags: [], modifierTags: [], examples: [] };
    return { comment, ...base };
}

export function buildParamComment(
    tsdoc: DocComment | undefined,
    parameterName: string,
    resolveLink: LinkResolver
): ParamComment {
    return commentFromParamBlock(tsdoc?.params.tryGetBlockByName(parameterName), resolveLink);
}

export function buildTypeParamComment(
    tsdoc: DocComment | undefined,
    typeParameterName: string,
    resolveLink: LinkResolver
): EngineComment | null {
    return commentFromParamBlock(tsdoc?.typeParams.tryGetBlockByName(typeParameterName), resolveLink).comment;
}

export function buildReturnsComment(
    tsdoc: DocComment | undefined,
    resolveLink: LinkResolver
): DocCommentBlockTag | null {
    if (!tsdoc?.returnsBlock) return null;
    return blockTag(tsdoc.returnsBlock, resolveLink);
}
