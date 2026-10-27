import { camelCase, kebabCase, pascalCase, snakeCase } from 'es-toolkit';

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
