/** @jsxImportSource react */
import { Component, lazy, memo, useState } from 'react';
import { describe, expect, it } from 'vitest';

import {
    ActionRow,
    Container,
    LinkButton,
    MediaGallery,
    MediaGalleryItem,
    Section,
    Separator,
    TextDisplay,
    Thumbnail,
    toComponentEmbed
} from '#src/index';

import { expectEmbedError, thrownBy } from './helpers';

import type { ReactElement } from 'react';

const IMAGE = 'https://example.com/image.png';

describe('toComponentEmbed', () => {
    it('wraps a container holding text in the component payload', () => {
        expect(
            toComponentEmbed(
                <Container>
                    <TextDisplay># Hello friend</TextDisplay>
                </Container>
            )
        ).toEqual({ component: { type: 17, components: [{ type: 10, content: '# Hello friend' }] } });
    });

    it("builds the full example from discord's component embed docs", () => {
        const site = 'https://watchanimeattheoffice.com';

        const embed = toComponentEmbed(
            <Container accentColor={1_752_220} spoiler={false}>
                <Section accessory={<LinkButton url={`${site}/posts/version2`} label="Open" />}>
                    <TextDisplay>
                        # **[New version out!]({site}/posts/version2)**{'\n'}The dungeon is deceptively tougher.
                    </TextDisplay>
                </Section>
                <MediaGallery>
                    <MediaGalleryItem
                        url={`${site}/photos/1.png`}
                        description="The main character entering the dungeon"
                    />
                    <MediaGalleryItem url={`${site}/photos/2.png`} />
                    <MediaGalleryItem url={`${site}/photos/3.png`} />
                </MediaGallery>
                <TextDisplay>*Screenshots of new content*</TextDisplay>
                <Separator spacing="small" />
                <ActionRow>
                    <LinkButton url={`${site}/store`} label="Store" />
                    <LinkButton url={`${site}/community`} label="Community" />
                    <LinkButton url={`${site}/patch-notes`} label="Patch Notes" />
                </ActionRow>
                <Separator />
                <Section accessory={<Thumbnail url={`${site}/new-boss.png`} spoiler />}>
                    <TextDisplay>
                        ## **[??????]({site}/me)**{'\n'}Who could this be?
                    </TextDisplay>
                </Section>
            </Container>
        );

        expect(embed).toEqual({
            component: {
                type: 17,
                spoiler: false,
                accent_color: 1_752_220,
                components: [
                    {
                        type: 9,
                        components: [
                            {
                                type: 10,
                                content: `# **[New version out!](${site}/posts/version2)**\nThe dungeon is deceptively tougher.`
                            }
                        ],
                        accessory: { type: 2, style: 5, url: `${site}/posts/version2`, label: 'Open' }
                    },
                    {
                        type: 12,
                        items: [
                            {
                                media: { url: `${site}/photos/1.png` },
                                description: 'The main character entering the dungeon'
                            },
                            { media: { url: `${site}/photos/2.png` } },
                            { media: { url: `${site}/photos/3.png` } }
                        ]
                    },
                    { type: 10, content: '*Screenshots of new content*' },
                    { type: 14, spacing: 1 },
                    {
                        type: 1,
                        components: [
                            { type: 2, style: 5, url: `${site}/store`, label: 'Store' },
                            { type: 2, style: 5, url: `${site}/community`, label: 'Community' },
                            { type: 2, style: 5, url: `${site}/patch-notes`, label: 'Patch Notes' }
                        ]
                    },
                    { type: 14 },
                    {
                        type: 9,
                        components: [{ type: 10, content: `## **[??????](${site}/me)**\nWho could this be?` }],
                        accessory: { type: 11, media: { url: `${site}/new-boss.png` }, spoiler: true }
                    }
                ]
            }
        });
    });

    it('writes large spacing, a hidden divider, and a disabled button', () => {
        const embed = toComponentEmbed(
            <Container>
                <Separator spacing="large" divider={false} />
                <ActionRow>
                    <LinkButton url="https://example.com" label="go" disabled />
                </ActionRow>
            </Container>
        );

        expect(embed.component.components).toEqual([
            { type: 14, spacing: 2, divider: false },
            { type: 1, components: [{ type: 2, style: 5, url: 'https://example.com', label: 'go', disabled: true }] }
        ]);
    });

    it('rejects an empty container', () => {
        expectEmbedError(() => toComponentEmbed(<Container />), '<Container> needs at least one component.');
        expectEmbedError(
            () => toComponentEmbed(<Container>{false}</Container>),
            '<Container> needs at least one component.'
        );
    });

    it('throws a ComponentEmbedError when the root is anything but a container', () => {
        expectEmbedError(
            () => toComponentEmbed(<TextDisplay>hi</TextDisplay>),
            'The root element must be a <Container>.'
        );
    });

    it('rejects a root with more than one element', () => {
        expectEmbedError(
            () =>
                toComponentEmbed(
                    <>
                        <Container>
                            <TextDisplay>one</TextDisplay>
                        </Container>
                        <Container>
                            <TextDisplay>two</TextDisplay>
                        </Container>
                    </>
                ),
            'The root must be one <Container>, got 2 elements.'
        );
    });

    it('rejects a component that cannot sit directly in a container', () => {
        expectEmbedError(
            () =>
                toComponentEmbed(
                    <Container>
                        <Thumbnail url={IMAGE} />
                    </Container>
                ),
            '<Thumbnail> cannot go directly inside a <Container>.'
        );
    });

    it.each([0x1_00_00_00, -1, 1.5])('rejects %s as an accent color', (accentColor) => {
        expectEmbedError(
            () =>
                toComponentEmbed(
                    <Container accentColor={accentColor}>
                        <TextDisplay>hi</TextDisplay>
                    </Container>
                ),
            `accentColor must be an integer from 0 to 0xFFFFFF, got ${String(accentColor)}.`
        );
    });

    it('allows 40 components, counting the container, buttons, and accessories', () => {
        const buttons = Array.from({ length: 5 }, (_, index) => (
            <LinkButton key={index} url="https://example.com" label="go" />
        ));
        const rows = Array.from({ length: 6 }, (_, index) => <ActionRow key={index}>{buttons}</ActionRow>);
        const section = (
            <Section accessory={<Thumbnail url={IMAGE} />}>
                <TextDisplay>hi</TextDisplay>
            </Section>
        );

        // 1 container, 6 rows of 6, and a section of 3 makes 40
        expect(() =>
            toComponentEmbed(
                <Container>
                    {rows}
                    {section}
                </Container>
            )
        ).not.toThrow();
        expectEmbedError(
            () =>
                toComponentEmbed(
                    <Container>
                        {rows}
                        {section}
                        <Separator />
                    </Container>
                ),
            'A component embed holds at most 40 components, this one has 41.'
        );
    });
});

describe('toComponentEmbed with sections, galleries, and rows', () => {
    it('accepts your own component as a section accessory', () => {
        function OpenButton(): ReactElement {
            return <LinkButton url="https://example.com" label="Open" />;
        }

        const embed = toComponentEmbed(
            <Container>
                <Section accessory={<OpenButton />}>
                    <TextDisplay>hi</TextDisplay>
                </Section>
            </Container>
        );

        expect(embed.component.components[0]).toEqual({
            type: 9,
            components: [{ type: 10, content: 'hi' }],
            accessory: { type: 2, style: 5, url: 'https://example.com', label: 'Open' }
        });
    });

    it('rejects a section accessory other than a thumbnail or a link button', () => {
        expectEmbedError(
            () =>
                toComponentEmbed(
                    <Container>
                        <Section accessory={<TextDisplay>no</TextDisplay>}>
                            <TextDisplay>hi</TextDisplay>
                        </Section>
                    </Container>
                ),
            'A <Section> accessory must be a <Thumbnail> or a <LinkButton>, got <TextDisplay>.'
        );
    });

    it('rejects a section with no accessory or two of them', () => {
        const oneAccessory = 'A <Section> takes exactly one accessory, a <Thumbnail> or a <LinkButton>.';
        const bare = (
            // @ts-expect-error a JS caller can still leave it out
            <Section>
                <TextDisplay>hi</TextDisplay>
            </Section>
        );
        const doubled = (
            <Section
                accessory={
                    <>
                        <Thumbnail url={IMAGE} />
                        <Thumbnail url={IMAGE} />
                    </>
                }
            >
                <TextDisplay>hi</TextDisplay>
            </Section>
        );

        expectEmbedError(() => toComponentEmbed(<Container>{bare}</Container>), oneAccessory);
        expectEmbedError(() => toComponentEmbed(<Container>{doubled}</Container>), oneAccessory);
    });

    it('rejects a section with more than three text displays', () => {
        expectEmbedError(
            () =>
                toComponentEmbed(
                    <Container>
                        <Section accessory={<Thumbnail url={IMAGE} />}>
                            <TextDisplay>1</TextDisplay>
                            <TextDisplay>2</TextDisplay>
                            <TextDisplay>3</TextDisplay>
                            <TextDisplay>4</TextDisplay>
                        </Section>
                    </Container>
                ),
            '<Section> takes 1 to 3 <TextDisplay> children, got 4.'
        );
    });

    it('rejects an action row holding anything but link buttons', () => {
        expectEmbedError(
            () =>
                toComponentEmbed(
                    <Container>
                        <ActionRow>
                            <TextDisplay>no</TextDisplay>
                        </ActionRow>
                    </Container>
                ),
            '<ActionRow> only takes <LinkButton> children, got <TextDisplay>.'
        );
    });

    it('rejects an empty media gallery', () => {
        expectEmbedError(
            () =>
                toComponentEmbed(
                    <Container>
                        <MediaGallery>{[]}</MediaGallery>
                    </Container>
                ),
            '<MediaGallery> takes 1 to 10 <MediaGalleryItem> children, got 0.'
        );
    });

    it.each([
        ['an attachment url', 'attachment://image.png', 'must be an http or https URL'],
        ['a relative url', '/relative/image.png', 'must be an http or https URL'],
        ['a url over 2048 characters', `https://example.com/${'a'.repeat(2048)}`, 'is longer than 2048 characters'],
        ['a url with a leading space', ` ${IMAGE}`, 'has whitespace in it'],
        ['a url with a newline in it', 'https://example.com/a\n.png', 'has whitespace in it']
    ])('rejects %s as media', (_label, url, problem) => {
        expectEmbedError(
            () =>
                toComponentEmbed(
                    <Container>
                        <MediaGallery>
                            <MediaGalleryItem url={url} />
                        </MediaGallery>
                    </Container>
                ),
            `The media url ${problem}`
        );
    });

    it('rejects a media description over 1024 characters', () => {
        expectEmbedError(
            () =>
                toComponentEmbed(
                    <Container>
                        <MediaGallery>
                            <MediaGalleryItem url={IMAGE} description={'d'.repeat(1025)} />
                        </MediaGallery>
                    </Container>
                ),
            'The media description is longer than 1024 characters (1025).'
        );
    });
});

describe('toComponentEmbed with text', () => {
    it('skips false, null, and undefined in text and joins nested arrays', () => {
        const isNew = false as boolean;
        const tags = ['a', 'b'];

        const embed = toComponentEmbed(
            <Container>
                <TextDisplay>
                    Release{isNew && ' (new)'}
                    {null}
                    {undefined}: {tags.map((tag) => `#${tag} `)}
                </TextDisplay>
            </Container>
        );

        expect(embed.component.components[0]).toEqual({ type: 10, content: 'Release: #a #b ' });
    });

    it('rejects text outside a text display', () => {
        expectEmbedError(
            () => toComponentEmbed(<Container>hello</Container>),
            'Text has to go inside a <TextDisplay>, got "hello".'
        );
    });

    it('rejects an element inside a text display', () => {
        const markup = (
            <TextDisplay>
                {/* @ts-expect-error a JS caller can still pass an element */}
                <b>bold</b>
            </TextDisplay>
        );

        expectEmbedError(
            () => toComponentEmbed(<Container>{markup}</Container>),
            '<TextDisplay> only takes text. Write Discord markdown like **bold** in place of <b>.'
        );
    });

    it('rejects a text display with no text', () => {
        expectEmbedError(
            () =>
                toComponentEmbed(
                    <Container>
                        <TextDisplay>{''}</TextDisplay>
                    </Container>
                ),
            '<TextDisplay> needs some text.'
        );
    });
});

describe('toComponentEmbed with your own components', () => {
    it('renders your own components down to the built-in ones', () => {
        function Headline({ title }: { title: string }): ReactElement {
            return <TextDisplay># {title}</TextDisplay>;
        }

        function Preview(): ReactElement {
            return (
                <Container>
                    <Headline title="Patch notes" />
                </Container>
            );
        }

        expect(toComponentEmbed(<Preview />)).toEqual({
            component: { type: 17, components: [{ type: 10, content: '# Patch notes' }] }
        });
    });

    it('rejects an async component', () => {
        // eslint-disable-next-line @typescript-eslint/require-await -- the async signature is the point of the test
        async function Preview(): Promise<ReactElement> {
            return (
                <Container>
                    <TextDisplay>hi</TextDisplay>
                </Container>
            );
        }

        expectEmbedError(
            () => toComponentEmbed(<Preview />),
            '<Preview> is async. Load its data first and pass it in as props.'
        );
    });

    it('rejects memo, lazy, and class components with one message', () => {
        const Memoized = memo(function Headline(): ReactElement {
            return <TextDisplay>hi</TextDisplay>;
        });
        const Lazy = lazy(() => Promise.resolve({ default: Memoized }));

        class Classy extends Component {
            override render(): ReactElement {
                return <TextDisplay>hi</TextDisplay>;
            }
        }

        class FieldRender extends Component {
            override render = (): ReactElement => <TextDisplay>hi</TextDisplay>;
        }

        const plainOnly = /^Only plain function components work inside a component embed\.$/;
        expectEmbedError(() => toComponentEmbed(<Container>{<Memoized />}</Container>), plainOnly);
        expectEmbedError(() => toComponentEmbed(<Container>{<Lazy />}</Container>), plainOnly);
        expectEmbedError(() => toComponentEmbed(<Container>{<Classy />}</Container>), plainOnly);
        expectEmbedError(() => toComponentEmbed(<Container>{<FieldRender />}</Container>), plainOnly);
    });

    it('turns an error inside your component into a ComponentEmbedError', () => {
        function Counter(): ReactElement {
            const [count] = useState(1);
            return <TextDisplay>{count}</TextDisplay>;
        }

        const error = thrownBy(() => toComponentEmbed(<Container>{<Counter />}</Container>));

        expect(error.code).toBe('ReadFailed');
        expect(error.message).toMatch(
            /^<Counter> threw while the package read it: .+\. Components here run outside React's renderer, so hooks don't work in them\.$/
        );
        expect(error.cause).toBeInstanceOf(TypeError);
    });
});
