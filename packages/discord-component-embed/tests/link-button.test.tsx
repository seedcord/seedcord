import { describe, expect, it } from 'vitest';

import { ActionRow, Container, LinkButton, TextDisplay, toComponentEmbed } from '#src/index';

import { expectEmbedError } from './helpers';

import type { ReactElement } from 'react';

function inRow(button: ReactElement): ReactElement {
    return (
        <Container>
            <ActionRow>{button}</ActionRow>
        </Container>
    );
}

describe('LinkButton', () => {
    // @ts-expect-error a JS caller can still leave out both the label and the emoji
    const bare = <LinkButton key="none" url="https://example.com" />;
    // @ts-expect-error an emoji needs a name or an id
    const emptyEmoji = <LinkButton key="b" url="https://example.com" emoji={{}} />;

    it.each([
        ['neither a label nor an emoji', bare, 'needs a label, an emoji, or both. Its url is https://example.com.'],
        [
            'an empty label',
            <LinkButton key="a" url="https://example.com" label="" />,
            'needs a label, an emoji, or both'
        ],
        ['an empty emoji', emptyEmoji, 'needs a label, an emoji, or both'],
        [
            'an emoji with an empty name',
            <LinkButton key="f" url="https://example.com" emoji={{ name: '' }} />,
            'needs a label, an emoji, or both'
        ],
        [
            'a label over 80 characters',
            <LinkButton key="c" url="https://example.com" label={'L'.repeat(81)} />,
            'The <LinkButton> label is longer than 80 characters (81).'
        ],
        [
            'a url over 512 characters',
            <LinkButton key="d" url={`https://example.com/${'a'.repeat(512)}`} label="go" />,
            'The <LinkButton> url is longer than 512 characters (532).'
        ],
        [
            'a javascript url',
            // eslint-disable-next-line no-script-url -- the test checks that this url is rejected
            <LinkButton key="e" url="javascript:alert(1)" label="go" />,
            'The <LinkButton> url must be an http, https, or discord URL, got javascript:alert(1).'
        ],
        [
            'a url with a space in it',
            <LinkButton key="g" url="https://example.com/a b" label="go" />,
            'The <LinkButton> url has whitespace in it'
        ]
    ])('rejects a link button with %s', (_label, button, message) => {
        expectEmbedError(() => toComponentEmbed(inRow(button)), message);
    });

    it('accepts a discord url', () => {
        const embed = toComponentEmbed(inRow(<LinkButton url="discord://-/channels/@me" label="Open Discord" />));

        expect(embed.component.components[0]).toEqual({
            type: 1,
            components: [{ type: 2, style: 5, url: 'discord://-/channels/@me', label: 'Open Discord' }]
        });
    });

    it('passes custom emoji through in text and on a button', () => {
        const embed = toComponentEmbed(
            <Container>
                <TextDisplay>Built with {'<a:seedcord:112233445566778899>'} seedcord</TextDisplay>
                <ActionRow>
                    <LinkButton
                        url="https://example.com"
                        emoji={{ name: 'github', id: '112233445566778899', animated: true }}
                    />
                </ActionRow>
            </Container>
        );

        expect(embed.component.components).toEqual([
            { type: 10, content: 'Built with <a:seedcord:112233445566778899> seedcord' },
            {
                type: 1,
                components: [
                    {
                        type: 2,
                        style: 5,
                        url: 'https://example.com',
                        emoji: { name: 'github', id: '112233445566778899', animated: true }
                    }
                ]
            }
        ]);
    });

    it('copies only the id, name, and animated keys of a button emoji', () => {
        const emoji = { name: '🍉', id: '1', animated: false, extra: true };
        const embed = toComponentEmbed(inRow(<LinkButton url="https://example.com" emoji={emoji} />));

        expect(embed.component.components[0]).toEqual({
            type: 1,
            components: [
                { type: 2, style: 5, url: 'https://example.com', emoji: { name: '🍉', id: '1', animated: false } }
            ]
        });
    });
});
