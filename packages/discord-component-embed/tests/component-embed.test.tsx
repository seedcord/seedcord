import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ComponentEmbed, Container, TextDisplay } from '#src/index';

import { scriptBody } from './helpers';

describe('ComponentEmbed', () => {
    it('renders the payload in the script tag discord reads', () => {
        const markup = renderToStaticMarkup(
            <ComponentEmbed>
                <Container accentColor={0x58_65_f2}>
                    <TextDisplay># Hello</TextDisplay>
                </Container>
            </ComponentEmbed>
        );

        expect(JSON.parse(scriptBody(markup))).toEqual({
            component: { type: 17, accent_color: 0x58_65_f2, components: [{ type: 10, content: '# Hello' }] }
        });
    });

    it('keeps text that looks like a closing script tag inside the JSON', () => {
        const content = '</script><script>alert(1)</script>';
        const markup = renderToStaticMarkup(
            <ComponentEmbed>
                <Container>
                    <TextDisplay>{content}</TextDisplay>
                </Container>
            </ComponentEmbed>
        );

        expect(markup.match(/<\/script/gi)).toHaveLength(1);
        expect(JSON.parse(scriptBody(markup))).toEqual({
            component: { type: 17, components: [{ type: 10, content }] }
        });
    });
});
