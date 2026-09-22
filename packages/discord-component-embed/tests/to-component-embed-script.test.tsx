/** @jsxImportSource react */
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';

import { Container, TextDisplay, toComponentEmbedScript } from '#src/index';

import { expectEmbedError, scriptBody } from './helpers';

describe('toComponentEmbedScript', () => {
    it('returns the script tag discord reads as an HTML string', () => {
        const html = toComponentEmbedScript(
            <Container>
                <TextDisplay># Hello</TextDisplay>
            </Container>
        );

        expect(JSON.parse(scriptBody(html))).toEqual({
            component: { type: 17, components: [{ type: 10, content: '# Hello' }] }
        });
    });

    it('keeps text that looks like a closing script tag inside the JSON', () => {
        const content = '</script><!-- <script>alert(1)</script>';
        const html = toComponentEmbedScript(
            <Container>
                <TextDisplay>{content}</TextDisplay>
            </Container>
        );

        expect(html.match(/<\/script/gi)).toHaveLength(1);
        expect(html).not.toContain('<!--');
        expect(JSON.parse(scriptBody(html))).toEqual({
            component: { type: 17, components: [{ type: 10, content }] }
        });
    });

    it('rejects a script whose JSON is over 3000 bytes', () => {
        expectEmbedError(
            () =>
                toComponentEmbedScript(
                    <Container>
                        <TextDisplay>{'a'.repeat(3000)}</TextDisplay>
                    </Container>
                ),
            "This component embed's JSON is 3065 bytes, over Discord's limit of 3000. Shorten its text or its URLs."
        );
    });

    it('accepts a tree built with createElement and no JSX', () => {
        const html = toComponentEmbedScript(createElement(Container, null, createElement(TextDisplay, null, 'hi')));

        expect(JSON.parse(scriptBody(html))).toEqual({
            component: { type: 17, components: [{ type: 10, content: 'hi' }] }
        });
    });
});
