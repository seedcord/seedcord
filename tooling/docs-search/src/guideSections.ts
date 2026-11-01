import type { StructuredData } from 'fumadocs-core/mdx-plugins';

export interface GuideSection {
    url: string;
    page: string;
    heading?: string;
    text: string;
}

export type GuideHit = Pick<GuideSection, 'page' | 'heading'> & { path: string };

export function guideHit({ url, page, heading }: GuideSection): GuideHit {
    return { path: url, page, ...(heading !== undefined && { heading }) };
}

interface GuidePage {
    url: string;
    title: string;
    description?: string | undefined;
    structuredData: StructuredData;
}

type Collecting = Omit<GuideSection, 'text'> & { lines: string[] };

export function guideSections({ url, title, description, structuredData }: GuidePage): GuideSection[] {
    const intro: Collecting = { url, page: title, lines: description ? [description] : [] };
    const headings = new Map(
        structuredData.headings.map(({ id, content }): [string, Collecting] => [
            id,
            { url: `${url}#${id}`, page: title, heading: content, lines: [] }
        ])
    );

    for (const { heading, content } of structuredData.contents) {
        const section = heading === undefined ? intro : headings.get(heading);
        if (!section) throw new Error(`${url} has text under #${heading}, a heading its structured data doesn't list`);
        section.lines.push(content);
    }

    return [intro, ...headings.values()].map(({ lines, ...section }) => ({ ...section, text: lines.join('\n') }));
}
