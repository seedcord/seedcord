import { resolveInlineHref } from '../resolvers';

import type { FormatContext, InlineTagPart, SeeAlsoEntry, SeeAlsoEntryWithoutTarget } from '../../types';
import type { DocComment } from '@seedcord/docs-engine';

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
            const see: SeeAlsoEntry = { name: nm } as SeeAlsoEntry;
            if (typeof href === 'string' && href.length) see.href = href;
            if (typeof entry.target !== 'undefined') see.target = entry.target;
            results.push(see);
        }
    }

    return results.length ? results : undefined;
}

// eslint-disable-next-line complexity
export function collectSeeAlsoFromBlockTags(comment: DocComment): SeeAlsoEntry[] | undefined {
    if (comment.blockTags.length === 0) return undefined;

    const collected: SeeAlsoEntryWithoutTarget[] = [];
    for (const tag of comment.blockTags) {
        if (tag.tag !== '@see') continue;

        let name: string | undefined = tag.text.trim().length ? tag.text.trim() : undefined;
        let href: string | undefined;
        let target: unknown;

        if (tag.content.length) {
            for (const part of tag.content) {
                if (!name && part.kind !== 'inline-tag' && part.text.trim().length) {
                    name = part.text.trim();
                }

                if (part.kind === 'inline-tag') {
                    const inline = part as InlineTagPart;
                    if (!name && inline.text.trim().length) {
                        name = inline.text.trim();
                    }
                    if (inline.url?.trim().length) {
                        href = inline.url.trim();
                    }
                    if (inline.target) {
                        target = inline.target;
                    }
                }
            }
        }

        if (!name && !href) continue;
        const entry: SeeAlsoEntry = { name: name ?? '' };
        if (href) entry.href = href;
        if (target) entry.target = target;
        collected.push(entry);
    }

    return collected.length ? collected : undefined;
}
