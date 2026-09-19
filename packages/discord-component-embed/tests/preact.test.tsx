/** @jsxImportSource preact */
// no preact/compat import here. loading it patches isReactComponent onto core preact's Component
import { Component, createContext } from 'preact';
import { describe, expect, it } from 'vitest';

import { Container, LinkButton, Section, TextDisplay, toComponentEmbed } from '#src/index';

import { thrownBy } from './helpers';

import type { VNode } from 'preact';

describe('preact elements', () => {
    it('reads a tree built with preact jsx, fragments and your own components included', () => {
        function Headline({ title }: { title: string }): VNode {
            return (
                <>
                    <TextDisplay># {title}</TextDisplay>
                </>
            );
        }

        const embed = toComponentEmbed(
            <Container>
                <Section accessory={<LinkButton url="https://example.com" label="Open" />}>
                    <Headline title="Patch notes" />
                </Section>
            </Container>
        );

        expect(embed.component.components).toEqual([
            {
                type: 9,
                components: [{ type: 10, content: '# Patch notes' }],
                accessory: { type: 2, style: 5, url: 'https://example.com', label: 'Open' }
            }
        ]);
    });

    it('rejects a preact class component as unsupported', () => {
        class Headline extends Component {
            override render(): VNode {
                return <TextDisplay>hi</TextDisplay>;
            }
        }

        const error = thrownBy(() =>
            toComponentEmbed(
                <Container>
                    <Headline />
                </Container>
            )
        );

        expect(error.code).toBe('UnsupportedComponent');
        expect(error.message).toBe('Only plain function components work inside a component embed.');
    });

    it('rejects a context provider and consumer as unsupported', () => {
        const Theme = createContext('light');

        for (const tree of [
            <Container>
                <Theme.Provider value="dark">
                    <TextDisplay>hi</TextDisplay>
                </Theme.Provider>
            </Container>,
            <Container>
                <Theme.Consumer>{(theme) => <TextDisplay>{theme}</TextDisplay>}</Theme.Consumer>
            </Container>
        ]) {
            expect(thrownBy(() => toComponentEmbed(tree)).code).toBe('UnsupportedComponent');
        }
    });
});
