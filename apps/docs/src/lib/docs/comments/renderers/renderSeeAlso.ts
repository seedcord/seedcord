import { resolveInlineHref } from '../resolvers';

import type { FormatContext, InlineTagPart, SeeAlsoEntry, SeeAlsoEntryWithoutTarget } from '../../types';
import type { DocComment, DocCommentBlockTag } from '@seedcord/docs-engine';

type DocCommentPart = DocCommentBlockTag['content'][number];

export function renderSeeAlso(comment: DocComment, context: FormatContext): SeeAlsoEntry[] | undefined {
    const collected = collectSeeAlsoFromBlockTags(comment);
    if (!collected || collected.length === 0) return undefined;

    const results: SeeAlsoEntry[] = [];
    function splitNames(raw: string): string[] {
        if (!raw) return [];
        const lines = raw
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean);

        const parts: string[] = [];
        for (const line of lines) {
            const text = line.replace(/^[-*\u2022]\s*/, '').trim();

            if (/\s[-–—]\s/.test(text)) {
                parts.push(
                    ...text
                        .split(/\s[-–—]\s+/)
                        .map((s) => s.trim())
                        .filter(Boolean)
                );
                continue;
            }

            if (text.includes(',')) {
                parts.push(
                    ...text
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean)
                );
                continue;
            }

            parts.push(text);
        }

        return parts;
    }

    for (const entry of collected) {
        let href = entry.href;
        if (!href && typeof entry.target !== 'undefined') {
            try {
                const resolved = resolveInlineHref(
                    { kind: 'inline-tag', tag: '@link', text: entry.name, target: entry.target } as InlineTagPart,
                    context
                );
                if (resolved) href = resolved;
            } catch {
                // ignore
            }
        }

        const names = splitNames(entry.name);
        if (names.length === 0) continue;

        for (const nm of names) {
            const see: SeeAlsoEntry = { name: nm };
            if (typeof href === 'string' && href.length) see.href = href;
            if (typeof entry.target !== 'undefined') see.target = entry.target;
            results.push(see);
        }
    }

    return results.length ? results : undefined;
}

interface PartAccumulator {
    name: string | undefined;
    href: string | undefined;
    target: unknown;
}

function applyInlineTagPart(part: InlineTagPart, acc: PartAccumulator): void {
    if (!acc.name && part.text.trim().length) acc.name = part.text.trim();
    if (part.url?.trim().length) acc.href = part.url.trim();
    if (part.target) acc.target = part.target;
}

function applyTextPart(part: DocCommentPart, acc: PartAccumulator): void {
    if (!acc.name && part.text.trim().length) acc.name = part.text.trim();
}

function extractSeeEntry(tag: DocCommentBlockTag): SeeAlsoEntryWithoutTarget | null {
    const initialName = tag.text.trim();
    const acc: PartAccumulator = {
        name: initialName.length ? initialName : undefined,
        href: undefined,
        target: undefined
    };

    for (const part of tag.content) {
        if (part.kind === 'inline-tag') {
            applyInlineTagPart(part, acc);
        } else {
            applyTextPart(part, acc);
        }
    }

    if (!acc.name && !acc.href) return null;
    const entry: SeeAlsoEntry = { name: acc.name ?? '' };
    if (acc.href) entry.href = acc.href;
    if (acc.target) entry.target = acc.target;
    return entry;
}

function collectSeeAlsoFromBlockTags(comment: DocComment): SeeAlsoEntry[] | undefined {
    if (comment.blockTags.length === 0) return undefined;

    const collected: SeeAlsoEntryWithoutTarget[] = [];
    for (const tag of comment.blockTags) {
        if (tag.tag !== '@see') continue;
        const entry = extractSeeEntry(tag);
        if (entry) collected.push(entry);
    }

    return collected.length ? collected : undefined;
}
