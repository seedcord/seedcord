import { toComponentEmbedJson } from 'discord-component-embed';
import { describe, expect, it } from 'vitest';

import { PREVIEW_EMOJI, PreviewCard } from '#src/LinkPreview';

import type { ReactElement } from 'react';

const card = (body: string): ReactElement => (
    <PreviewCard
        accent={0}
        breadcrumb={['docs', '@seedcord/plugin-kysely-postgres', 'v0.5.2']}
        breadcrumbEmoji={PREVIEW_EMOJI.docs}
        title="OmitIndexSignature"
        titleEmoji={PREVIEW_EMOJI.type}
        body={body}
        subtext={['type']}
        links={[{ emoji: PREVIEW_EMOJI.github, label: 'Source', url: 'https://github.com/seedcord/seedcord' }]}
    />
);

// discord's component type for a section
const SECTION = 9;

const paragraph = (n: number): string =>
    `Paragraph ${String(n)} explains how an empty object is assignable to a type with only an index signature.`;
const fence = (n: number): string =>
    ['```ts', `type Step${String(n)} = {} extends Record<string, unknown>`, "    ? 'yes'", "    : 'no';", '```'].join(
        '\n'
    );

const longSummaryWithCode = Array.from({ length: 20 }, (_, n) => `${paragraph(n)}\n\n${fence(n)}`).join('\n');

function bodyOf(json: string): string {
    // justified: the card puts its title and body in one text display at the top level
    const { component } = JSON.parse(json) as { component: { components: { content?: string }[] } };
    const heading = component.components.find(({ content }) => content?.startsWith('## '))?.content ?? '';
    return heading.slice(heading.indexOf('\n') + 1);
}

describe('PreviewCard', () => {
    it('ends a body that would push the card past the limit at the last whole block that fits', () => {
        const body = bodyOf(toComponentEmbedJson(card(longSummaryWithCode)));

        expect(body.endsWith('\n…')).toBe(true);
        expect(longSummaryWithCode.startsWith(body.slice(0, -'\n…'.length))).toBe(true);
        expect(body.match(/^```/gm)?.length ?? 0).toSatisfy((fences: number) => fences % 2 === 0);
    });

    it('puts the breadcrumb in the section beside the thumbnail', () => {
        const json = toComponentEmbedJson(
            <PreviewCard
                accent={0}
                breadcrumb={['blog']}
                title="seedcord blog"
                body="Posts."
                thumbnail={{ url: 'https://cdn.seedcord.org/assets/logo.png', description: 'the seedcord mark' }}
                links={[{ emoji: PREVIEW_EMOJI.home, label: 'Home', url: 'https://seedcord.org' }]}
            />
        );
        // justified: JSON.parse is untyped. toComponentEmbedJson writes this shape for a card with a thumbnail
        const { component } = JSON.parse(json) as {
            component: { components: { type: number; components?: { content: string }[] }[] };
        };

        const [first] = component.components;
        expect(first?.type).toBe(SECTION);
        expect(first?.components?.[0]?.content).toBe('-# blog');
    });

    it('keeps a body that fits as it is', () => {
        const body = `${paragraph(1)}\n\n${fence(1)}`;

        expect(bodyOf(toComponentEmbedJson(card(body)))).toBe(body);
    });
});
