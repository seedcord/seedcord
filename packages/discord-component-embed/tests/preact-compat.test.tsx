/** @jsxImportSource preact */
import { Component, forwardRef, lazy, memo } from 'preact/compat';
import { describe, expect, it } from 'vitest';

import { Container, TextDisplay, toComponentEmbed } from '#src/index';

import { thrownBy } from './helpers';

import type { VNode } from 'preact';

function Title(): VNode {
    return <TextDisplay>hi</TextDisplay>;
}

describe('preact/compat components', () => {
    it('rejects memo, forwardRef, and class components the same way react does', () => {
        const Memoized = memo(Title);
        const Forwarded = forwardRef(Title);
        class Classy extends Component {
            override render(): VNode {
                return <TextDisplay>hi</TextDisplay>;
            }
        }

        for (const tree of [
            <Container>
                <Memoized />
            </Container>,
            <Container>
                <Forwarded />
            </Container>,
            <Container>
                <Classy />
            </Container>
        ]) {
            const error = thrownBy(() => toComponentEmbed(tree));
            expect(error.code).toBe('UnsupportedComponent');
        }
    });

    it('rejects a lazy component, which throws a promise while it loads', () => {
        const Lazy = lazy(() => Promise.resolve({ default: Title }));

        const error = thrownBy(() =>
            toComponentEmbed(
                <Container>
                    <Lazy />
                </Container>
            )
        );

        expect(error.code).toBe('UnsupportedComponent');
        // preact ships minified. the component lazy returns is named i
        expect(error.message).toMatch(
            /^<\w+> suspends while it loads\. Load its data first and pass it in as props\.$/
        );
    });
});
