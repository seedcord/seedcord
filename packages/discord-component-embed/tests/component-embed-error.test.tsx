/** @jsxImportSource react */
import { memo } from 'react';
import { describe, expect, it } from 'vitest';

import {
    ActionRow,
    componentEmbedResponse,
    Container,
    LinkButton,
    Separator,
    TextDisplay,
    toComponentEmbed
} from '#src/index';

import { thrownBy, withText } from './helpers';

import type { ComponentEmbedErrorCode } from '#src/index';
import type { ReactElement } from 'react';

describe('ComponentEmbedError', () => {
    it.each<[ComponentEmbedErrorCode, () => unknown]>([
        ['InvalidStructure', () => toComponentEmbed(<TextDisplay>hi</TextDisplay>)],
        [
            'InvalidProp',
            () =>
                toComponentEmbed(
                    <Container>
                        {/* @ts-expect-error a JS caller can still pass another value */}
                        <Separator spacing="medium" />
                    </Container>
                )
        ],
        [
            'OverLimit',
            () =>
                toComponentEmbed(
                    <Container>
                        <ActionRow>
                            <LinkButton url="https://example.com" label={'L'.repeat(81)} />
                        </ActionRow>
                    </Container>
                )
        ],
        ['OverLimit', () => componentEmbedResponse(withText('€'.repeat(1000)))],
        [
            'UnsupportedComponent',
            () => {
                const Memoized = memo(function Headline(): ReactElement {
                    return <TextDisplay>hi</TextDisplay>;
                });
                return toComponentEmbed(<Container>{<Memoized />}</Container>);
            }
        ]
    ])('sets the code %s', (code, run) => {
        expect(thrownBy(run).code).toBe(code);
    });

    it('wraps an error from your component with its message and the original as cause', () => {
        const boom = new Error('page data missing');
        function Broken(): ReactElement {
            throw boom;
        }

        const error = thrownBy(() => toComponentEmbed(<Container>{<Broken />}</Container>));

        expect(error.code).toBe('ReadFailed');
        expect(error.cause).toBe(boom);
        expect(error.message).toContain('<Broken> threw while the package read it: page data missing.');
    });

    it('wraps an error from an iterator in the tree with the original as cause', () => {
        const boom = new Error('iterator broke');
        const children = {
            [Symbol.iterator]: () => ({
                next: () => {
                    throw boom;
                }
            })
        };

        const error = thrownBy(() => toComponentEmbed(<Container>{children}</Container>));

        expect(error.code).toBe('ReadFailed');
        expect(error.cause).toBe(boom);
        expect(error.message).toBe('Reading the component tree threw: iterator broke.');
    });
});
