import { describe, expect, it } from 'vitest';

import {
    ActionRow,
    Container,
    LinkButton,
    MediaGallery,
    MediaGalleryItem,
    Separator,
    TextDisplay,
    h,
    toComponentEmbed
} from '#src/index';

import { expectEmbedError, inContainer, thrownBy } from './helpers';

import type { EmbedElement } from '#src/index';

const IMAGE = 'https://example.com/image.png';

// a JS caller of h. TypeScript does not check these props
function loose(type: unknown, props: Record<string, unknown> | null, ...children: unknown[]): EmbedElement {
    return (h as (...args: unknown[]) => EmbedElement)(type, props, ...children);
}

describe('toComponentEmbed with untyped props', () => {
    it('walks iterable children', () => {
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
            'a media url that is a symbol',
            loose(MediaGallery, null, loose(MediaGalleryItem, { url: Symbol('x') })),
            'The media url must be a string, got Symbol(x).'
        ],
        [
            'a media url object that serializes to another url',
            loose(
                MediaGallery,
                null,
                loose(MediaGalleryItem, { url: { toString: () => IMAGE, toJSON: () => 'ftp://example.com' } })
            ),
            'The media url must be a string, got "ftp://example.com".'
        ],
        [
            'a button url that is a symbol',
            loose(ActionRow, null, loose(LinkButton, { url: Symbol('x'), label: 'go' })),
            'The <LinkButton> url must be a string, got Symbol(x).'
        ],
        [
            'a button url that is a symbol on a button with no label',
            loose(ActionRow, null, loose(LinkButton, { url: Symbol('x') })),
            'The <LinkButton> url must be a string, got Symbol(x).'
        ],
        [
            'a symbol in a text display',
            loose(TextDisplay, null, 'a', Symbol('x')),
            '<TextDisplay> only takes text, got Symbol(x).'
        ]
    ])('rejects %s', (_label, child, message) => {
        expectEmbedError(() => toComponentEmbed(inContainer(child)), message);
    });

    it('rejects a component that returns a promise-like object', () => {
        const promise = Promise.resolve(null);
        function Preview(): PromiseLike<null> {
            // eslint-disable-next-line unicorn/no-thenable -- the object with a then method is the input under test
            return { then: promise.then.bind(promise) };
        }

        const error = thrownBy(() => toComponentEmbed(inContainer(loose(Preview, null))));

        expect(error.code).toBe('UnsupportedComponent');
        expect(error.message).toBe('<Preview> is async. Load its data first and pass it in as props.');
    });

    it('rejects a container spoiler that is a string', () => {
        expectEmbedError(
            () => toComponentEmbed(loose(Container, { spoiler: 'yes' }, loose(TextDisplay, null, 'hi'))),
            'The <Container> spoiler must be a boolean, got "yes".'
        );
    });

    it('rejects an object whose Symbol.iterator is not a function', () => {
        expectEmbedError(
            () => toComponentEmbed(loose(Container, null, { [Symbol.iterator]: 1 })),
            'Text has to go inside a <TextDisplay>, got {}.'
        );
    });

    it('describes values that JSON.stringify cannot print', () => {
        const circular: Record<string, unknown> = {};
        circular.self = circular;

        const badLabel = loose(ActionRow, null, loose(LinkButton, { url: 'https://example.com', label: 5n }));
        const badDescription = loose(
            MediaGallery,
            null,
            loose(MediaGalleryItem, { url: IMAGE, description: circular })
        );

        expectEmbedError(
            () => toComponentEmbed(inContainer(badLabel)),
            'The <LinkButton> label must be a string, got 5n.'
        );
        expectEmbedError(
            () => toComponentEmbed(inContainer(badDescription)),
            'The media description must be a string, got an object.'
        );
    });
});
