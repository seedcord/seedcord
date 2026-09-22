/** @jsxImportSource react */
import { describe, expect, it } from 'vitest';

import { ActionRow, Container, LinkButton, Section, TextDisplay, Thumbnail, toComponentEmbed } from '#src/index';

import { thrownBy } from './helpers';

import type { ReactElement } from 'react';

const IMAGE = 'https://example.com/image.png';
const BAD_URL = 'ftp://example.com';

describe('ComponentEmbedError path', () => {
    it('says where the broken component sits, through your own components', () => {
        function PostCard(): ReactElement {
            return (
                <>
                    <Section accessory={<Thumbnail url={IMAGE} />}>
                        <TextDisplay>first</TextDisplay>
                    </Section>
                    <Section accessory={<Thumbnail url={IMAGE} />}>
                        <TextDisplay>{''}</TextDisplay>
                    </Section>
                </>
            );
        }

        const error = thrownBy(() =>
            toComponentEmbed(
                <Container>
                    <PostCard />
                </Container>
            )
        );

        expect(error.path).toEqual(['Container', 'PostCard', 'Section 2', 'TextDisplay']);
        expect(error.message).toBe(
            'A <TextDisplay> is empty. Give it some text or remove it.\nFound at Container > PostCard > Section 2 > TextDisplay'
        );
    });

    it('numbers two of your own components with the same name', () => {
        function Card({ text }: { text: string }): ReactElement {
            return (
                <Section accessory={<Thumbnail url={IMAGE} />}>
                    <TextDisplay>{text}</TextDisplay>
                </Section>
            );
        }

        const error = thrownBy(() =>
            toComponentEmbed(
                <Container>
                    <Card text="first" />
                    <Card text="" />
                </Container>
            )
        );

        expect(error.path).toEqual(['Container', 'Card 2', 'Section', 'TextDisplay']);
    });

    it('numbers two different components that share a name', () => {
        function makeCard(text: string): () => ReactElement {
            const Card = (): ReactElement => (
                <Section accessory={<Thumbnail url={IMAGE} />}>
                    <TextDisplay>{text}</TextDisplay>
                </Section>
            );
            return Card;
        }
        const FirstCard = makeCard('first');
        const SecondCard = makeCard('');

        const error = thrownBy(() =>
            toComponentEmbed(
                <Container>
                    <FirstCard />
                    <SecondCard />
                </Container>
            )
        );

        expect(error.path).toEqual(['Container', 'Card 2', 'Section', 'TextDisplay']);
    });

    it('numbers a component among the siblings written next to it', () => {
        function OneSection(): ReactElement {
            return (
                <Section accessory={<Thumbnail url={IMAGE} />}>
                    <TextDisplay>{''}</TextDisplay>
                </Section>
            );
        }

        const error = thrownBy(() =>
            toComponentEmbed(
                <Container>
                    <Section accessory={<Thumbnail url={IMAGE} />}>
                        <TextDisplay>first</TextDisplay>
                    </Section>
                    <OneSection />
                </Container>
            )
        );

        expect(error.path).toEqual(['Container', 'OneSection', 'Section', 'TextDisplay']);
    });

    it("uses a component's displayName over its function name", () => {
        function Internal(): ReactElement {
            return <TextDisplay>{''}</TextDisplay>;
        }
        Internal.displayName = 'Shown';

        expect(thrownBy(() => toComponentEmbed(<Container>{<Internal />}</Container>)).path).toEqual([
            'Container',
            'Shown',
            'TextDisplay'
        ]);
    });

    it('calls a component with no name Anonymous', () => {
        const [Unnamed] = [(): ReactElement => <TextDisplay>{''}</TextDisplay>] as const;

        expect(thrownBy(() => toComponentEmbed(<Container>{<Unnamed />}</Container>)).path).toEqual([
            'Container',
            'Anonymous',
            'TextDisplay'
        ]);
    });

    it('points through your own component at a wrong root', () => {
        function Wrap(): ReactElement {
            return <TextDisplay>hi</TextDisplay>;
        }

        expect(thrownBy(() => toComponentEmbed(<Wrap />)).path).toEqual(['Wrap', 'TextDisplay']);
    });

    it.each([
        [
            'the third of three buttons in a row',
            <ActionRow key="r">
                <LinkButton url="https://example.com" label="a" />
                <LinkButton url="https://example.com" label="b" />
                <LinkButton url={BAD_URL} label="c" />
            </ActionRow>,
            ['Container', 'ActionRow', 'LinkButton 3']
        ],
        [
            'a button used as a section accessory',
            <Section key="s" accessory={<LinkButton url={BAD_URL} label="open" />}>
                <TextDisplay>hi</TextDisplay>
            </Section>,
            ['Container', 'Section', 'LinkButton']
        ]
    ])('points at %s', (_label, child, path) => {
        expect(thrownBy(() => toComponentEmbed(<Container>{child}</Container>)).path).toEqual(path);
    });

    it('stays empty for a limit on the whole embed', () => {
        const error = thrownBy(() =>
            toComponentEmbed(
                <Container>
                    <TextDisplay>{'a'.repeat(3000)}</TextDisplay>
                </Container>
            )
        );

        expect(error.path).toEqual([]);
        expect(error.message).not.toContain('Found at');
    });
});
