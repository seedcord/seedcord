import { camelCase, kebabCase, pascalCase, snakeCase } from 'es-toolkit';

import type { SharedHelperName, TemplateHelper } from './helperNames';

// a new bot's prettier config sets singleQuote
function quote(text: string): string {
    const escaped = JSON.stringify(text)
        .slice(1, -1)
        .replaceAll(String.raw`\"`, '"')
        .replaceAll("'", String.raw`\'`);
    return `'${escaped}'`;
}

export const CLI_HELPERS = {
    pascal: pascalCase,
    camel: camelCase,
    snake: snakeCase,
    kebab: kebabCase,
    quote
} satisfies Record<SharedHelperName, TemplateHelper>;
