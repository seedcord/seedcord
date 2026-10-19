import { highlightFenceToHtml } from '@seedcord/ui/shiki';

import type { Token, Tokens } from 'marked';

// marked's Token union includes Tokens.Generic, whose type is any string
// that's why just checking the type isn't really enough
const isCodeToken = (token: Token): token is Tokens.Code =>
    token.type === 'code' && 'text' in token && typeof token.text === 'string';

export async function highlightCodeToken(token: Token): Promise<void> {
    if (!isCodeToken(token)) return;

    const html = await highlightFenceToHtml(token.text, token.lang ?? '');
    if (html) Object.assign(token, { type: 'html', text: html });
}
