import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';
import { asError } from '@seedcord/utils/internal';

import type { Template, TemplateFile } from './Template';

// handlebars throws a plain Error for a template it can't parse or render
export function inTemplateFile<Result>(template: Template, file: TemplateFile, run: () => Result): Result {
    try {
        return run();
    } catch (error: unknown) {
        if (isSeedcordError(error)) throw error;
        throw new SeedcordTypeError(
            SeedcordErrorCode.MakeTemplateFailed,
            [file.path, template.from, asError(error).message],
            { cause: error }
        );
    }
}
