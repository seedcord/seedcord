import { camelCase, kebabCase, pascalCase, snakeCase } from 'es-toolkit';

import type { RenderProject } from './TemplateOutput';

const DATE_TIME_DIGITS = 'YYYYMMDDHHmmss'.length;

function timestamp(): string {
    return new Date().toISOString().replaceAll(/\D/g, '').slice(0, DATE_TIME_DIGITS);
}

export const CLI_HELPERS = {
    pascal: pascalCase,
    camel: camelCase,
    snake: snakeCase,
    kebab: kebabCase,
    timestamp
};

// registered per file while rendering, since it reads that file's path
export const IMPORT_OF = 'importOf';

export function helperNames(projectHelpers: RenderProject['helpers']): Set<string> {
    return new Set([...Object.keys(CLI_HELPERS), IMPORT_OF, ...Object.keys(projectHelpers)]);
}
