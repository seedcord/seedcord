import type { ComponentEmbedPayload } from './toComponentEmbed';

// eslint-disable-next-line unicorn/prefer-string-raw -- its String.raw autofix turns \\u003c into a bare < over two lint:fix runs
const ESCAPED_LT = '\\u003c';

// in a <script>, </ can close the tag early and <!-- can hide the real closing tag
export function serialize(payload: ComponentEmbedPayload): string {
    return JSON.stringify(payload)
        .replaceAll('</', String.raw`<\/`)
        .replaceAll('<!--', `${ESCAPED_LT}!--`);
}
