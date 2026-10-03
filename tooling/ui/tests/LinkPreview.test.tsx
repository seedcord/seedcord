import { toComponentEmbedJson } from 'discord-component-embed';
import { describe, expect, it } from 'vitest';

import { PREVIEW_EMOJI, PreviewCard } from '#src/LinkPreview';

import type { ReactElement } from 'react';

const DISCORD_JSON_LIMIT = 3000;

const card = (body: string): ReactElement => (
    <PreviewCard
        accent={0}
        breadcrumb={['docs', '@seedcord/core', 'v0.9.2']}
        breadcrumbEmoji={PREVIEW_EMOJI.docs}
        title="Cooldown"
        titleEmoji={PREVIEW_EMOJI.function}
        body={body}
        subtext={['function', '2 parameters']}
        links={[{ emoji: PREVIEW_EMOJI.github, label: 'Source', url: 'https://github.com/seedcord/seedcord' }]}
    />
);

describe('PreviewCard', () => {
    it('shortens a body that would push the card past Discord limit', () => {
        const json = toComponentEmbedJson(card('word '.repeat(1000)));

        expect(new TextEncoder().encode(json).length).toBeLessThanOrEqual(DISCORD_JSON_LIMIT);
        expect(json).toContain('…');
    });

    it('keeps a body that fits as it is', () => {
        const body = 'Allows limit uses per window, scoped by per.';

        expect(toComponentEmbedJson(card(body))).toContain(body);
    });
});
