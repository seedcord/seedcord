import type { StructuredData } from 'fumadocs-core/mdx-plugins';
import type { Except } from 'type-fest';

export interface GuideSection {
    path: string;
    tab: string;
    page: string;
    heading?: string;
    text: string;
}

export type GuideHit = Pick<GuideSection, 'path' | 'tab' | 'page' | 'heading'>;

export function guideHit({ path, tab, page, heading }: GuideSection): GuideHit {
    return { path, tab, page, ...(heading !== undefined && { heading }) };
}

interface GuidePage {
    path: string;
    tab: string;
    title: string;
    description?: string | undefined;
    structuredData: StructuredData;
}

type Collecting = Except<GuideSection, 'text'> & { lines: string[] };

export function guideSections({ path, tab, title, description, structuredData }: GuidePage): GuideSection[] {
    const intro: Collecting = { path, tab, page: title, lines: description ? [description] : [] };
    const headings = new Map(
        structuredData.headings.map(({ id, content }): [string, Collecting] => [
            id,
            { path: `${path}#${id}`, tab, page: title, heading: content, lines: [] }
        ])
    );

    for (const { heading, content } of structuredData.contents) {
        const section = heading === undefined ? intro : headings.get(heading);
        if (!section) throw new Error(`${path} has text under #${heading}, a heading its structured data doesn't list`);
        section.lines.push(content);
    }

    return [intro, ...headings.values()].map(({ lines, ...section }) => ({ ...section, text: lines.join('\n') }));
}
