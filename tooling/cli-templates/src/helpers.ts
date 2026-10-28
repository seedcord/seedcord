import { camelCase, kebabCase, pascalCase, snakeCase } from 'es-toolkit';

import { CLI_HELPER_NAMES } from './helperNames';

import type { SharedHelperName, TemplateHelper } from './helperNames';
import type { RenderProject } from './TemplateOutput';

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

export function helperNames(projectHelpers: RenderProject['helpers']): Set<string> {
    return new Set([...CLI_HELPER_NAMES, ...Object.keys(projectHelpers)]);
}
