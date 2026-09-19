import { toComponentEmbed } from './toComponentEmbed';

import type { EmbedElement } from './element';

// discord reads only a script with this exact id
export const SCRIPT_ID = 'discord:component-embed';

// escaping every < keeps a </script in the text from closing the tag
export function toScriptJson(root: EmbedElement): string {
    // eslint-disable-next-line unicorn/prefer-string-raw -- its String.raw autofix turns \\u003c into a bare < over two lint:fix runs
    return JSON.stringify(toComponentEmbed(root)).replaceAll('<', '\\u003c');
}
