import { createElement } from 'react';
import { describe, expect, it } from 'vitest';

import {
    ActionRow,
    Container,
    LinkButton,
    MediaGallery,
    MediaGalleryItem,
    Separator,
    TextDisplay,
    toComponentEmbed
} from '#src/index';

import { expectEmbedError } from './helpers';

import type { ReactElement } from 'react';

const IMAGE = 'https://example.com/image.png';

// how a JS caller or a Svelte server file builds the tree. TypeScript does not check these props
function loose(type: unknown, props: Record<string, unknown> | null, ...children: unknown[]): ReactElement {
    return (createElement as (...args: unknown[]) => ReactElement)(type, props, ...children);
}

function inContainer(child: ReactElement): () => unknown {
    return () => toComponentEmbed(loose(Container, null, child));
}

describe('toComponentEmbed with untyped props', () => {
    it('walks iterable children the way React does', () => {
        const texts = new Set([loose(TextDisplay, null, 'a'), loose(TextDisplay, null, 'b')]);

        expect(toComponentEmbed(loose(Container, null, texts)).component.components).toEqual([
            { type: 10, content: 'a' },
            { type: 10, content: 'b' }
        ]);
    });

    it.each([
        [
            'a separator spacing outside small and large',
            loose(Separator, { spacing: 'medium' }),
            `The <Separator> spacing must be 'small' or 'large', got "medium".`
        ],
        [
            'a separator divider that is a string',
            loose(Separator, { divider: 'no' }),
            'The <Separator> divider must be a boolean, got "no".'
        ],
        [
            'a media spoiler that is a string',
            loose(MediaGallery, null, loose(MediaGalleryItem, { url: IMAGE, spoiler: 'yes' })),
            'The media spoiler must be a boolean, got "yes".'
        ],
        [
            'a media description that is a number',
            loose(MediaGallery, null, loose(MediaGalleryItem, { url: IMAGE, description: 5 })),
            'The media description must be a string, got 5.'
        ],
        [
            'a button label that is a number',
            loose(ActionRow, null, loose(LinkButton, { url: 'https://example.com', label: 5 })),
            'The <LinkButton> label must be a string, got 5.'
        ],
        [
            'a button disabled flag that is a string',
            loose(ActionRow, null, loose(LinkButton, { url: 'https://example.com', label: 'go', disabled: 'true' })),
            'The <LinkButton> disabled must be a boolean, got "true".'
        ],
        [
            'an emoji name that is a number',
            loose(ActionRow, null, loose(LinkButton, { url: 'https://example.com', emoji: { name: 5 } })),
            'The <LinkButton> emoji name must be a string, got 5.'
        ],
        [
            'an emoji animated flag that is a string',
            loose(
                ActionRow,
                null,
                loose(LinkButton, { url: 'https://example.com', emoji: { id: '1', animated: 'yes' } })
            ),
            'The <LinkButton> emoji animated must be a boolean, got "yes".'
        ],
        [
            'a symbol in a text display',
            loose(TextDisplay, null, 'a', Symbol('x')),
            '<TextDisplay> only takes text, got Symbol(x).'
        ]
    ])('rejects %s', (_label, child, message) => {
        expectEmbedError(inContainer(child), message);
    });

    it('rejects a container spoiler that is a string', () => {
        expectEmbedError(
            () => toComponentEmbed(loose(Container, { spoiler: 'yes' }, loose(TextDisplay, null, 'hi'))),
            'The <Container> spoiler must be a boolean, got "yes".'
        );
    });
});
