/** @jsxImportSource react */
import { Component, forwardRef, lazy, memo, useState } from 'react';
import { describe, expect, it } from 'vitest';

import { Container, TextDisplay, toComponentEmbed } from '#src/index';

import { expectEmbedError, thrownBy } from './helpers';

import type { ReactElement } from 'react';

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

    it('rejects memo, lazy, forwardRef, and class components with one message', () => {
        const Memoized = memo(function Headline(): ReactElement {
            return <TextDisplay>hi</TextDisplay>;
        });
        const Lazy = lazy(() => Promise.resolve({ default: Memoized }));
        const Forwarded = forwardRef(function Caption(): ReactElement {
            return <TextDisplay>hi</TextDisplay>;
        });

        class Classy extends Component {
            override render(): ReactElement {
                return <TextDisplay>hi</TextDisplay>;
            }
        }

        class FieldRender extends Component {
            override render = (): ReactElement => <TextDisplay>hi</TextDisplay>;
        }

        const cases: [ReactElement, string][] = [
            [<Memoized key="m" />, 'Headline'],
            [<Lazy key="l" />, 'Anonymous'],
            [<Forwarded key="r" />, 'Caption'],
            [<Classy key="c" />, 'Classy'],
            [<FieldRender key="f" />, 'FieldRender']
        ];
        for (const [element, name] of cases) {
            const error = thrownBy(() => toComponentEmbed(<Container>{element}</Container>));

            expect(error.path).toEqual(['Container', name]);
            expect(error.message).toBe(
                `Only plain function components work inside a component embed.\nFound at Container > ${name}`
            );
        }
    });

    it('turns an error inside your component into a ComponentEmbedError', () => {
        function Counter(): ReactElement {
            const [count] = useState(1);
            return <TextDisplay>{count}</TextDisplay>;
        }

        const error = thrownBy(() => toComponentEmbed(<Container>{<Counter />}</Container>));

        expect(error.code).toBe('ReadFailed');
        expect(error.message).toMatch(
            /^<Counter> threw while the package read it: .+\. Components here run outside React's renderer, so hooks don't work in them\.\nFound at Container > Counter$/
        );
        expect(error.cause).toBeInstanceOf(TypeError);
    });
});
