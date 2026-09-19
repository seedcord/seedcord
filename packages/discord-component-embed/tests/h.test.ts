import { describe, expect, it } from 'vitest';

import { ActionRow, Container, LinkButton, Section, TextDisplay, h, toComponentEmbed } from '#src/index';

import { expectEmbedError, inContainer } from './helpers';

import type { EmbedElement } from '#src/index';

describe('h', () => {
    it('builds a tree that toComponentEmbed reads', () => {
        const open = h(LinkButton, { url: 'https://example.com', label: 'Open' });
        const tree = h(
            Container,
            { accentColor: 0xf8_f6_e8 },
            h(Section, { accessory: open }, h(TextDisplay, null, '# hi')),
            h(TextDisplay, null, 'two ', 'parts')
        );

        expect(toComponentEmbed(tree)).toEqual({
            component: {
                type: 17,
                accent_color: 0xf8_f6_e8,
                components: [
                    {
                        type: 9,
                        components: [{ type: 10, content: '# hi' }],
                        accessory: { type: 2, style: 5, url: 'https://example.com', label: 'Open' }
                    },
                    { type: 10, content: 'two parts' }
                ]
            }
        });
    });

    it('rejects missing or wrong children in TypeScript and at runtime', () => {
        // @ts-expect-error an action row needs link buttons
        const emptyRow = h(ActionRow, null);
        // @ts-expect-error a text display only takes text
        const nestedText = h(TextDisplay, null, h(Container, null));

        expectEmbedError(
            () => toComponentEmbed(inContainer(emptyRow)),
            '<ActionRow> takes 1 to 5 <LinkButton> children, got 0.'
        );
        expectEmbedError(() => toComponentEmbed(inContainer(nestedText)), '<TextDisplay> only takes text.');
    });

    it('rejects children on a component that takes none, in TypeScript', () => {
        function Title(): EmbedElement {
            return h(TextDisplay, null, 'hi');
        }

        // @ts-expect-error Title has no children prop
        const withChild = h(Title, null, h(TextDisplay, null, 'dropped'));

        expect(toComponentEmbed(inContainer(withChild)).component.components).toEqual([{ type: 10, content: 'hi' }]);
    });

    it('rejects an async component in TypeScript and at runtime', () => {
        // eslint-disable-next-line @typescript-eslint/require-await -- the async signature is the input under test
        async function Preview(): Promise<EmbedElement> {
            return h(TextDisplay, null, 'hi');
        }

        // @ts-expect-error an async component returns a promise
        const tree = inContainer(h(Preview, null));

        expectEmbedError(() => toComponentEmbed(tree), '<Preview> is async.');
    });

    it('calls your own components with their props', () => {
        function Headline({ title }: { title: string }): EmbedElement {
            return h(TextDisplay, null, `# ${title}`);
        }

        expect(toComponentEmbed(h(Container, null, h(Headline, { title: 'Patch notes' })))).toEqual({
            component: { type: 17, components: [{ type: 10, content: '# Patch notes' }] }
        });
    });
});
