import { highlightFenceToHtml } from '@seedcord/ui/shiki';

import type { Token, Tokens } from 'marked';

// marked's Tokens.Generic accepts any type string
const isCodeToken = (token: Token): token is Tokens.Code =>
    token.type === 'code' && 'text' in token && typeof token.text === 'string';

export async function highlightCodeToken(token: Token): Promise<void> {
    if (!isCodeToken(token)) return;

    const html = await highlightFenceToHtml(token.text, token.lang ?? '');
    if (html) Object.assign(token, { type: 'html', text: html });
}
