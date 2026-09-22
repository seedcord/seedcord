/** @jsxImportSource react */
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

import { expectEmbedError } from './helpers';

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
        function Nothing(): null {
            return null;
        }

        expectEmbedError(
            () => toComponentEmbed(<TextDisplay>hi</TextDisplay>),
            'The root has to be a <Container>, got <TextDisplay>.'
        );
        expectEmbedError(() => toComponentEmbed(<Nothing />), 'The root has to be a <Container>, got nothing.');
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
            'The root has 2 elements. Put all of the components in one <Container> and pass only that.'
        );
    });

    it.each([
        ['<Thumbnail>', <Thumbnail key="t" url={IMAGE} />, 'Use it as a <Section> accessory'],
        [
            '<LinkButton>',
            <LinkButton key="b" url="https://example.com" label="go" />,
            'Put it in an <ActionRow> or use it as a <Section> accessory'
        ],
        ['<MediaGalleryItem>', <MediaGalleryItem key="m" url={IMAGE} />, 'Put it in a <MediaGallery>']
    ])('tells you where %s goes when it sits straight in a container', (name, element, hint) => {
        expectEmbedError(
            () => toComponentEmbed(<Container>{element}</Container>),
            `${name} can't go straight inside a <Container>. ${hint}.`
        );
    });

    it('counts the backslash each </ gets toward the 3000 bytes', () => {
        // 2065 bytes before escaping, plus a backslash for each of the 1000 </
        const content = '</'.repeat(1000);

        expectEmbedError(
            () =>
                toComponentEmbed(
                    <Container>
                        <TextDisplay>{content}</TextDisplay>
                    </Container>
                ),
            "This component embed's JSON is 3065 bytes, over Discord's limit of 3000. Shorten its text or its URLs."
        );
    });

    it('counts the escape each <!-- gets toward the 3000 bytes', () => {
        // 2465 bytes before escaping. each of the 600 < becomes a six-byte escape
        const content = '<!--'.repeat(600);

        expectEmbedError(
            () =>
                toComponentEmbed(
                    <Container>
                        <TextDisplay>{content}</TextDisplay>
                    </Container>
                ),
            "This component embed's JSON is 5465 bytes, over Discord's limit of 3000."
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
            `accentColor must be a whole number from 0 to 0xFFFFFF (like 0x5865f2), got ${String(accentColor)}.`
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
            "This component embed has 41 components. Discord allows 40, and the <Container>, buttons, and thumbnails all count toward that. Gallery items don't. Merge neighboring <TextDisplay>s into one, or remove some components."
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
        const oneAccessory = 'A <Section> needs exactly one accessory, a <Thumbnail> or a <LinkButton>, got';
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

        expectEmbedError(() => toComponentEmbed(<Container>{bare}</Container>), `${oneAccessory} none.`);
        expectEmbedError(() => toComponentEmbed(<Container>{doubled}</Container>), `${oneAccessory} 2.`);
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
            '<Section> needs 1 to 3 <TextDisplay> children, got 4.'
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
            '<MediaGallery> needs 1 to 10 <MediaGalleryItem> children, got 0.'
        );
    });

    it.each([
        ['an attachment url', 'attachment://image.png', 'must be an http or https URL'],
        ['a relative url', '/relative/image.png', 'must be an http or https URL'],
        [
            'a url over 2048 characters',
            `https://example.com/${'a'.repeat(2048)}`,
            "is 2068 characters, 20 over Discord's limit of 2048"
        ],
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

    it('allows 10 gallery items across galleries and rejects an 11th', () => {
        const items = (count: number): ReactElement[] =>
            Array.from({ length: count }, (_, index) => <MediaGalleryItem key={index} url={IMAGE} />);

        // a thumbnail doesn't count toward the 10
        expect(() =>
            toComponentEmbed(
                <Container>
                    <Section accessory={<Thumbnail url={IMAGE} />}>
                        <TextDisplay>hi</TextDisplay>
                    </Section>
                    <MediaGallery>{items(4)}</MediaGallery>
                    <MediaGallery>{items(3)}</MediaGallery>
                    <MediaGallery>{items(3)}</MediaGallery>
                </Container>
            )
        ).not.toThrow();
        expectEmbedError(
            () =>
                toComponentEmbed(
                    <Container>
                        <MediaGallery>{items(4)}</MediaGallery>
                        <MediaGallery>{items(4)}</MediaGallery>
                        <MediaGallery>{items(3)}</MediaGallery>
                    </Container>
                ),
            "The galleries in this component embed hold 11 items (4 + 4 + 3). Discord allows 10 across all of them. Remove some, or show them as <Section> thumbnails, which don't count toward the 10."
        );
    });

    it('shows the start of a description that runs too long, keeping an emoji whole', () => {
        // the moon takes two UTF-16 units, the 40th and 41st
        const description = `${'d'.repeat(39)}🌙${'d'.repeat(993)}`;

        expectEmbedError(
            () =>
                toComponentEmbed(
                    <Container>
                        <MediaGallery>
                            <MediaGalleryItem url={IMAGE} description={description} />
                        </MediaGallery>
                    </Container>
                ),
            `The media description is 1034 characters, 10 over Discord's limit of 1024. It starts with "${'d'.repeat(39)}🌙".`
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
            'Got "hello" where only components can go. Wrap text in a <TextDisplay> and put that in a <Container> or a <Section>.'
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
            'A <TextDisplay> is empty. Give it some text or remove it.'
        );
    });
});
