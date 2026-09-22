/** @jsxImportSource react */
import { describe, expect, it } from 'vitest';

import { collectPayloadErrors } from '#src/fromPayload';
import {
    ActionRow,
    Container,
    LinkButton,
    MediaGallery,
    MediaGalleryItem,
    Section,
    TextDisplay,
    Thumbnail
} from '#src/index';
import { collectErrors } from '#src/toComponentEmbed';

import type { ReactElement } from 'react';

describe('collectErrors', () => {
    it('reports one error for each broken component', () => {
        const errors = collectErrors(
            <Container>
                <TextDisplay>{''}</TextDisplay>
                <Section accessory={<Thumbnail url="ftp://example.com/a.png" />}>
                    <TextDisplay>fine</TextDisplay>
                </Section>
                <MediaGallery>
                    <MediaGalleryItem url="https://example.com/a.png" />
                    <MediaGalleryItem url="https://example.com/b.png" description={'d'.repeat(1025)} />
                </MediaGallery>
                <ActionRow>
                    <LinkButton url="https://example.com" label="fine" />
                    <LinkButton url="https://example.com" label={'x'.repeat(81)} />
                </ActionRow>
            </Container>
        );

        expect(errors.map((error) => error.path)).toEqual([
            ['Container', 'TextDisplay'],
            ['Container', 'Section', 'Thumbnail'],
            ['Container', 'MediaGallery', 'MediaGalleryItem 2'],
            ['Container', 'ActionRow', 'LinkButton 2']
        ]);
    });

    it('reports every limit the whole embed breaks', () => {
        const texts = Array.from({ length: 40 }, (_, index) => <TextDisplay key={index}>line</TextDisplay>);
        const items = (count: number): ReactElement[] =>
            Array.from({ length: count }, (_, index) => (
                <MediaGalleryItem key={index} url="https://example.com/a.png" />
            ));

        const errors = collectErrors(
            <Container>
                {texts}
                <MediaGallery>{items(6)}</MediaGallery>
                <MediaGallery>{items(6)}</MediaGallery>
            </Container>
        );

        expect(errors.map((error) => error.message.split('.')[0])).toEqual([
            'This component embed has 43 components',
            'The galleries in this component embed hold 12 items (6 + 6)'
        ]);
    });

    it('reports every broken component in JSON, with JSON paths', () => {
        const errors = collectPayloadErrors({
            component: {
                type: 17,
                components: [
                    { type: 3, custom_id: 'pick' },
                    { type: 10, content: 'fine' },
                    { type: 14, spacing: 3 }
                ]
            }
        });

        expect(errors.map((error) => error.path)).toEqual([
            ['component', 'components', '0'],
            ['component', 'components', '2']
        ]);
    });

    it('runs the tree checks once the JSON itself is fine', () => {
        const errors = collectPayloadErrors({
            component: {
                type: 17,
                components: [
                    { type: 10, content: '' },
                    { type: 10, content: '' }
                ]
            }
        });

        expect(errors.map((error) => error.path)).toEqual([
            ['Container', 'TextDisplay 1'],
            ['Container', 'TextDisplay 2']
        ]);
    });

    it('returns nothing for a card that passes', () => {
        expect(
            collectErrors(
                <Container>
                    <TextDisplay>hi</TextDisplay>
                </Container>
            )
        ).toEqual([]);
    });
});
