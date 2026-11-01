import type { StructuredData } from 'fumadocs-core/mdx-plugins';

export interface GuideSection {
    url: string;
    tab: string;
    page: string;
    heading?: string;
    text: string;
}

export type GuideHit = Pick<GuideSection, 'tab' | 'page' | 'heading'> & { path: string };

export function guideHit({ url, tab, page, heading }: GuideSection): GuideHit {
    return { path: url, tab, page, ...(heading !== undefined && { heading }) };
}

interface GuidePage {
    url: string;
    tab: string;
    title: string;
    description?: string | undefined;
    structuredData: StructuredData;
}

type Collecting = Omit<GuideSection, 'text'> & { lines: string[] };

export function guideSections({ url, tab, title, description, structuredData }: GuidePage): GuideSection[] {
    const intro: Collecting = { url, tab, page: title, lines: description ? [description] : [] };
    const headings = new Map(
        structuredData.headings.map(({ id, content }): [string, Collecting] => [
            id,
            { url: `${url}#${id}`, tab, page: title, heading: content, lines: [] }
        ])
    );

    for (const { heading, content } of structuredData.contents) {
        const section = heading === undefined ? intro : headings.get(heading);
        if (!section) throw new Error(`${url} has text under #${heading}, a heading its structured data doesn't list`);
        section.lines.push(content);
    }

    return [intro, ...headings.values()].map(({ lines, ...section }) => ({ ...section, text: lines.join('\n') }));
}
