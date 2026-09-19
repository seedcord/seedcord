import { describe, expect, it } from 'vitest';

import { ActionRow, Container, LinkButton, Section, TextDisplay, h, toComponentEmbed } from '#src/index';

import type { EmbedElement } from '#src/index';

describe('jsx-runtime', () => {
    it('builds the same element as h', () => {
        expect(<TextDisplay>hi</TextDisplay>).toEqual(h(TextDisplay, null, 'hi'));
    });

    it('builds the same payload as h', () => {
        const links = ['https://a.example', 'https://b.example'];

        const fromJsx = toComponentEmbed(
            <Container accentColor={0xf8_f6_e8}>
                <Section accessory={<LinkButton url="https://example.com" label="Open" />}>
                    <TextDisplay># hi</TextDisplay>
                </Section>
                <ActionRow>
                    {links.map((url) => (
                        <LinkButton key={url} url={url} label="go" />
                    ))}
                </ActionRow>
            </Container>
        );
        const fromH = toComponentEmbed(
            h(
                Container,
                { accentColor: 0xf8_f6_e8 },
                h(
                    Section,
                    { accessory: h(LinkButton, { url: 'https://example.com', label: 'Open' }) },
                    h(TextDisplay, null, '# hi')
                ),
                h(
                    ActionRow,
                    null,
                    links.map((url) => h(LinkButton, { url, label: 'go' }))
                )
            )
        );

        expect(fromJsx).toEqual(fromH);
    });

    it('builds an element with a key written after a spread', () => {
        const buttons = [{ url: 'https://a.example', label: 'a' }];

        const embed = toComponentEmbed(
            <Container>
                <ActionRow>
                    {buttons.map((button) => (
                        <LinkButton {...button} key={button.url} />
                    ))}
                </ActionRow>
            </Container>
        );

        expect(embed.component.components).toEqual([
            { type: 1, components: [{ type: 2, style: 5, url: 'https://a.example', label: 'a' }] }
        ]);
    });

    it('keeps a key out of your component props, before or after a spread', () => {
        const received: unknown[] = [];
        function Title(props: { text: string }): EmbedElement {
            received.push(props);
            return <TextDisplay>{props.text}</TextDisplay>;
        }
        const shared = { text: 'a' };

        toComponentEmbed(
            <Container>
                <Title {...shared} key="after" />
                <Title key="before" {...shared} />
            </Container>
        );

        expect(received).toEqual([{ text: 'a' }, { text: 'a' }]);
    });

    it('reads fragments and your own components', () => {
        function Lines(): EmbedElement {
            return (
                <>
                    <TextDisplay>one</TextDisplay>
                    <TextDisplay>two</TextDisplay>
                </>
            );
        }

        expect(
            toComponentEmbed(
                <Container>
                    <Lines />
                </Container>
            ).component.components
        ).toEqual([
            { type: 10, content: 'one' },
            { type: 10, content: 'two' }
        ]);
    });

    it('reads a component that returns an array', () => {
        function Lines(): EmbedElement[] {
            return [<TextDisplay key="1">one</TextDisplay>, <TextDisplay key="2">two</TextDisplay>];
        }

        expect(
            toComponentEmbed(
                <Container>
                    <Lines />
                </Container>
            ).component.components
        ).toEqual([
            { type: 10, content: 'one' },
            { type: 10, content: 'two' }
        ]);
    });

    it('rejects an html tag', () => {
        expect(() =>
            toComponentEmbed(
                <Container>
                    {/* @ts-expect-error an HTML tag is a type error */}
                    <div />
                </Container>
            )
        ).toThrow('<div> cannot go directly inside a <Container>.');
    });
});
